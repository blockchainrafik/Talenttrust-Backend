import { 
  ContractResponse, 
  ContractListResponse, 
  CreateContractDto, 
  UpdateContractDto, 
  ContractQueryParams 
} from '../modules/contracts/dto/contract.dto';
import { ContractsRepository, InMemoryContractsRepository } from '../repositories/contracts.repository';
import { SorobanService } from './soroban.service';

/**
 * Service layer for managing Freelancer Escrow Contracts.
 * Handles business logic, validation, and orchestration with external services.
 * Uses repository pattern for data access abstraction.
 */
export class ContractsService {
  private repository: ContractsRepository;
  private sorobanService: SorobanService;

  constructor(repository?: ContractsRepository) {
    this.repository = repository || new InMemoryContractsRepository();
    this.sorobanService = new SorobanService();
  }

  /**
   * Retrieves multiple contracts with filtering, sorting, and pagination
   * @param params Query parameters for filtering and pagination
   * @returns Paginated list of contracts
   */
  public async getContracts(params: ContractQueryParams): Promise<ContractListResponse> {
    return this.repository.findMany(params);
  }

  /**
   * Retrieves a single contract by ID
   * @param id Contract ID
   * @returns Contract details or null if not found
   */
  public async getContractById(id: string): Promise<ContractResponse | null> {
    return this.repository.findById(id);
  }

  /**
   * Creates a new contract with business logic validation
   * @param data Contract creation data
   * @returns Newly created contract
   */
  public async createContract(data: CreateContractDto): Promise<ContractResponse> {
    // Business logic validation
    this.validateContractData(data);
    
    const contract = await this.repository.create(data);
    
    // Notify Soroban service to prepare escrow transaction
    try {
      await this.sorobanService.prepareEscrow(contract.id, contract.budget);
    } catch (error) {
      // Log error but don't fail contract creation
      console.warn(`Failed to prepare escrow for contract ${contract.id}:`, error);
    }

    return contract;
  }

  /**
   * Updates an existing contract with business logic validation
   * @param id Contract ID
   * @param data Contract update data
   * @returns Updated contract
   */
  public async updateContract(id: string, data: UpdateContractDto): Promise<ContractResponse> {
    // Verify contract exists
    const existingContract = await this.repository.findById(id);
    if (!existingContract) {
      throw new Error(`Contract with id ${id} not found`);
    }

    // Business logic validation for updates
    this.validateContractUpdate(existingContract, data);

    return this.repository.update(id, data);
  }

  /**
   * Deletes a contract with business logic validation
   * @param id Contract ID
   */
  public async deleteContract(id: string): Promise<void> {
    // Verify contract exists
    const existingContract = await this.repository.findById(id);
    if (!existingContract) {
      throw new Error(`Contract with id ${id} not found`);
    }

    // Business logic: prevent deletion of active contracts
    if (existingContract.status === 'ACTIVE') {
      throw new Error('Cannot delete an active contract');
    }

    // Business logic: prevent deletion of contracts with completed milestones
    if (existingContract.milestones?.some(m => m.completed)) {
      throw new Error('Cannot delete contract with completed milestones');
    }

    await this.repository.delete(id);
  }

  /**
   * Validates contract creation data
   * @param data Contract creation data
   */
  private validateContractData(data: CreateContractDto): void {
    // Validate budget against milestones if provided
    if (data.milestones && data.milestones.length > 0) {
      const totalMilestoneAmount = data.milestones.reduce((sum, milestone) => sum + milestone.amount, 0);
      if (totalMilestoneAmount > data.budget) {
        throw new Error('Total milestone amounts cannot exceed contract budget');
      }
    }

    // Validate deadline is in the future if provided
    if (data.deadline) {
      const deadlineDate = new Date(data.deadline);
      if (deadlineDate <= new Date()) {
        throw new Error('Contract deadline must be in the future');
      }
    }

    // Validate milestone deadlines
    if (data.milestones) {
      for (const milestone of data.milestones) {
        if (milestone.deadline) {
          const milestoneDeadline = new Date(milestone.deadline);
          if (milestoneDeadline <= new Date()) {
            throw new Error('All milestone deadlines must be in the future');
          }
        }
      }
    }
  }

  /**
   * Validates contract update data against existing contract
   * @param existingContract Existing contract data
   * @param updateData Update data
   */
  private validateContractUpdate(
    existingContract: ContractResponse, 
    updateData: UpdateContractDto
  ): void {
    // Business logic: prevent changing budget if milestones are completed
    if (updateData.budget && existingContract.milestones?.some(m => m.completed)) {
      throw new Error('Cannot modify budget when milestones are completed');
    }

    // Business logic: validate budget against milestones if both are being updated
    if (updateData.budget && updateData.milestones) {
      const totalMilestoneAmount = updateData.milestones.reduce((sum, milestone) => sum + milestone.amount, 0);
      if (totalMilestoneAmount > updateData.budget) {
        throw new Error('Total milestone amounts cannot exceed contract budget');
      }
    }

    // Business logic: validate deadline changes
    if (updateData.deadline) {
      const newDeadline = new Date(updateData.deadline);
      if (newDeadline <= new Date()) {
        throw new Error('Contract deadline must be in the future');
      }
    }

    // Business logic: restrict status transitions
    if (updateData.status) {
      this.validateStatusTransition(existingContract.status, updateData.status);
    }
  }

  /**
   * Validates contract status transitions according to business rules
   * @param currentStatus Current contract status
   * @param newStatus Proposed new status
   */
  private validateStatusTransition(
    currentStatus: ContractResponse['status'], 
    newStatus: ContractResponse['status']
  ): void {
    const allowedTransitions: Record<ContractResponse['status'], ContractResponse['status'][]> = {
      'PENDING': ['ACTIVE', 'CANCELLED'],
      'ACTIVE': ['COMPLETED', 'CANCELLED', 'DISPUTED'],
      'COMPLETED': [], // Terminal state
      'CANCELLED': [], // Terminal state
      'DISPUTED': ['COMPLETED', 'CANCELLED'], // Can be resolved
    };

    if (!allowedTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  /**
   * Gets contract statistics (utility method for analytics)
   * @returns Contract statistics
   */
  public async getContractStats(): Promise<{
    total: number;
    byStatus: Record<ContractResponse['status'], number>;
    totalBudget: number;
  }> {
    const allContracts = await this.repository.findMany({
      page: 1,
      limit: 10000, // Large limit to get all contracts
    });

    const stats = {
      total: allContracts.pagination.total,
      byStatus: {
        PENDING: 0,
        ACTIVE: 0,
        COMPLETED: 0,
        CANCELLED: 0,
        DISPUTED: 0,
      },
      totalBudget: allContracts.contracts.reduce((sum, contract) => sum + contract.budget, 0),
    };

    allContracts.contracts.forEach(contract => {
      stats.byStatus[contract.status]++;
    });

    return stats;
  }
}
