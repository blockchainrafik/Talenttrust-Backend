import { ContractsService } from './contracts.service';
import { SorobanService } from './soroban.service';
import { InMemoryContractsRepository } from '../repositories/contracts.repository';
import { CreateContractDto, UpdateContractDto, ContractQueryParams } from '../modules/contracts/dto/contract.dto';

// Mock the SorobanService to isolate tests
jest.mock('./soroban.service');

describe('ContractsService', () => {
  let contractsService: ContractsService;
  let mockRepository: InMemoryContractsRepository;
  let mockSorobanService: jest.Mocked<SorobanService>;

  beforeEach(() => {
    mockRepository = new InMemoryContractsRepository();
    mockSorobanService = new SorobanService() as jest.Mocked<SorobanService>;
    
    // Mock the prepareEscrow method
    mockSorobanService.prepareEscrow = jest.fn().mockResolvedValue(undefined);
    
    contractsService = new ContractsService(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getContracts', () => {
    it('should return paginated contracts', async () => {
      // Create test contracts
      await contractsService.createContract({
        title: 'Contract 1',
        description: 'First contract',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        budget: 1000,
      });

      await contractsService.createContract({
        title: 'Contract 2',
        description: 'Second contract',
        clientId: '550e8400-e29b-41d4-a716-446655440001',
        budget: 2000,
      });

      const params: ContractQueryParams = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const result = await contractsService.getContracts(params);

      expect(result.contracts).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should filter contracts by status', async () => {
      await contractsService.createContract({
        title: 'Contract 1',
        description: 'First contract',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        budget: 1000,
        status: 'PENDING',
      });

      await contractsService.createContract({
        title: 'Contract 2',
        description: 'Second contract',
        clientId: '550e8400-e29b-41d4-a716-446655440001',
        budget: 2000,
        status: 'ACTIVE',
      });

      const params: ContractQueryParams = {
        page: 1,
        limit: 10,
        status: 'PENDING',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const result = await contractsService.getContracts(params);

      expect(result.contracts).toHaveLength(1);
      expect(result.contracts[0].status).toBe('PENDING');
    });
  });

  describe('getContractById', () => {
    it('should return a contract when found', async () => {
      const contractData: CreateContractDto = {
        title: 'Test Contract',
        description: 'A test contract',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        budget: 1000,
      };

      const created = await contractsService.createContract(contractData);
      const found = await contractsService.getContractById(created.id);

      expect(found).toEqual(created);
    });

    it('should return null when contract not found', async () => {
      const result = await contractsService.getContractById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('createContract', () => {
    it('should create a contract with valid data', async () => {
      const contractData: CreateContractDto = {
        title: 'Build a frontend',
        description: 'React TS development',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        budget: 500,
      };

      const result = await contractsService.createContract(contractData);

      expect(result).toMatchObject({
        title: 'Build a frontend',
        description: 'React TS development',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        budget: 500,
        status: 'PENDING',
        freelancerId: null,
        terms: null,
        milestones: null,
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      expect(mockSorobanService.prepareEscrow).toHaveBeenCalledWith(result.id, 500);
    });

    it('should create a contract with milestones', async () => {
      const contractData: CreateContractDto = {
        title: 'Contract with milestones',
        description: 'A contract with milestones',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        budget: 2000,
        milestones: [
          {
            title: 'Milestone 1',
            description: 'First milestone',
            amount: 1000,
            completed: false,
          },
          {
            title: 'Milestone 2',
            description: 'Second milestone',
            amount: 1000,
            completed: false,
          },
        ],
      };

      const result = await contractsService.createContract(contractData);

      expect(result.milestones).toHaveLength(2);
      expect(result.milestones![0].title).toBe('Milestone 1');
      expect(mockSorobanService.prepareEscrow).toHaveBeenCalledWith(result.id, 2000);
    });

    it('should throw error when milestone amounts exceed budget', async () => {
      const contractData: CreateContractDto = {
        title: 'Invalid contract',
        description: 'Contract with invalid milestones',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        budget: 1000,
        milestones: [
          {
            title: 'Milestone 1',
            description: 'First milestone',
            amount: 1500,
            completed: false,
          },
        ],
      };

      await expect(contractsService.createContract(contractData)).rejects.toThrow(
        'Total milestone amounts cannot exceed contract budget'
      );
    });

    it('should throw error when deadline is in the past', async () => {
      const contractData: CreateContractDto = {
        title: 'Invalid contract',
        description: 'Contract with past deadline',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        budget: 1000,
        deadline: '2020-01-01T00:00:00Z',
      };

      await expect(contractsService.createContract(contractData)).rejects.toThrow(
        'Contract deadline must be in the future'
      );
    });

    it('should handle Soroban service errors gracefully', async () => {
      mockSorobanService.prepareEscrow.mockRejectedValue(new Error('Soroban error'));

      const contractData: CreateContractDto = {
        title: 'Test Contract',
        description: 'A test contract',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        budget: 1000,
      };

      // Should not throw error, just log warning
      const result = await contractsService.createContract(contractData);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });
  });

  describe('updateContract', () => {
    it('should update an existing contract', async () => {
      const contractData: CreateContractDto = {
        title: 'Original Contract',
        description: 'Original description',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        budget: 1000,
      };

      const created = await contractsService.createContract(contractData);
      const updateData: UpdateContractDto = {
        title: 'Updated Contract',
        budget: 1500,
        status: 'ACTIVE',
      };

      const updated = await contractsService.updateContract(created.id, updateData);

      expect(updated.id).toBe(created.id);
      expect(updated.title).toBe('Updated Contract');
      expect(updated.budget).toBe(1500);
      expect(updated.status).toBe('ACTIVE');
      expect(updated.updatedAt).not.toBe(created.updatedAt);
    });

    it('should throw error when updating non-existent contract', async () => {
      const updateData: UpdateContractDto = {
        title: 'Updated Contract',
      };

      await expect(contractsService.updateContract('non-existent-id', updateData)).rejects.toThrow(
        'Contract with id non-existent-id not found'
      );
    });

    it('should throw error for invalid status transition', async () => {
      const contractData: CreateContractDto = {
        title: 'Test Contract',
        description: 'A test contract',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        budget: 1000,
        status: 'COMPLETED',
      };

      const created = await contractsService.createContract(contractData);
      const updateData: UpdateContractDto = {
        status: 'ACTIVE',
      };

      await expect(contractsService.updateContract(created.id, updateData)).rejects.toThrow(
        'Invalid status transition from COMPLETED to ACTIVE'
      );
    });

    it('should throw error when modifying budget with completed milestones', async () => {
      const contractData: CreateContractDto = {
        title: 'Test Contract',
        description: 'A test contract',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        budget: 2000,
        milestones: [
          {
            title: 'Milestone 1',
            description: 'First milestone',
            amount: 1000,
            completed: true,
          },
          {
            title: 'Milestone 2',
            description: 'Second milestone',
            amount: 1000,
            completed: false,
          },
        ],
      };

      const created = await contractsService.createContract(contractData);
      const updateData: UpdateContractDto = {
        budget: 2500,
      };

      await expect(contractsService.updateContract(created.id, updateData)).rejects.toThrow(
        'Cannot modify budget when milestones are completed'
      );
    });
  });

  describe('deleteContract', () => {
    it('should delete a contract', async () => {
      const contractData: CreateContractDto = {
        title: 'Test Contract',
        description: 'A test contract',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        budget: 1000,
        status: 'PENDING',
      };

      const created = await contractsService.createContract(contractData);
      await contractsService.deleteContract(created.id);

      const found = await contractsService.getContractById(created.id);
      expect(found).toBeNull();
    });

    it('should throw error when deleting non-existent contract', async () => {
      await expect(contractsService.deleteContract('non-existent-id')).rejects.toThrow(
        'Contract with id non-existent-id not found'
      );
    });

    it('should throw error when deleting active contract', async () => {
      const contractData: CreateContractDto = {
        title: 'Active Contract',
        description: 'An active contract',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        budget: 1000,
        status: 'ACTIVE',
      };

      const created = await contractsService.createContract(contractData);

      await expect(contractsService.deleteContract(created.id)).rejects.toThrow(
        'Cannot delete an active contract'
      );
    });

    it('should throw error when deleting contract with completed milestones', async () => {
      const contractData: CreateContractDto = {
        title: 'Contract with milestones',
        description: 'A contract with completed milestones',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        budget: 2000,
        status: 'PENDING',
        milestones: [
          {
            title: 'Milestone 1',
            description: 'First milestone',
            amount: 1000,
            completed: true,
          },
        ],
      };

      const created = await contractsService.createContract(contractData);

      await expect(contractsService.deleteContract(created.id)).rejects.toThrow(
        'Cannot delete contract with completed milestones'
      );
    });
  });

  describe('getContractStats', () => {
    it('should return contract statistics', async () => {
      await contractsService.createContract({
        title: 'Contract 1',
        description: 'First contract',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        budget: 1000,
        status: 'PENDING',
      });

      await contractsService.createContract({
        title: 'Contract 2',
        description: 'Second contract',
        clientId: '550e8400-e29b-41d4-a716-446655440001',
        budget: 2000,
        status: 'ACTIVE',
      });

      await contractsService.createContract({
        title: 'Contract 3',
        description: 'Third contract',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        budget: 1500,
        status: 'COMPLETED',
      });

      const stats = await contractsService.getContractStats();

      expect(stats.total).toBe(3);
      expect(stats.byStatus.PENDING).toBe(1);
      expect(stats.byStatus.ACTIVE).toBe(1);
      expect(stats.byStatus.COMPLETED).toBe(1);
      expect(stats.totalBudget).toBe(4500);
    });

    it('should return zero stats for empty repository', async () => {
      const stats = await contractsService.getContractStats();

      expect(stats.total).toBe(0);
      expect(stats.byStatus.PENDING).toBe(0);
      expect(stats.byStatus.ACTIVE).toBe(0);
      expect(stats.byStatus.COMPLETED).toBe(0);
      expect(stats.totalBudget).toBe(0);
    });
  });
});
