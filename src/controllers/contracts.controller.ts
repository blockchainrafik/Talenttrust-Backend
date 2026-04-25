import { Request, Response, NextFunction } from 'express';
import { ContractsService } from '../services/contracts.service';
import { 
  CreateContractDto, 
  UpdateContractDto, 
  ContractQueryParams, 
  ContractIdParams,
  ContractResponse,
  ContractListResponse 
} from '../modules/contracts/dto/contract.dto';

const contractsService = new ContractsService();

/**
 * Standard API response envelope for consistent responses
 */
interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Presentation layer for Contracts.
 * Handles HTTP requests, extracts parameters, and formulates responses.
 * Delegates core logic to the ContractsService.
 */
export class ContractsController {
  
  /**
   * GET /api/v1/contracts
   * Fetch contracts with filtering, sorting, and pagination
   */
  public static async getContracts(req: Request, res: Response, next: NextFunction) {
    try {
      const queryParams: ContractQueryParams = req.query as any;
      const result: ContractListResponse = await contractsService.getContracts(queryParams);
      
      const response: ApiResponse<ContractListResponse> = {
        status: 'success',
        data: result,
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/contracts/:id
   * Fetch a single contract by ID
   */
  public static async getContractById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as ContractIdParams;
      const contract: ContractResponse | null = await contractsService.getContractById(id);
      
      if (!contract) {
        const response: ApiResponse = {
          status: 'error',
          error: 'Contract not found',
        };
        return res.status(404).json(response);
      }
      
      const response: ApiResponse<ContractResponse> = {
        status: 'success',
        data: contract,
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/contracts
   * Create a new contract
   */
  public static async createContract(req: Request, res: Response, next: NextFunction) {
    try {
      const data: CreateContractDto = req.body;
      const newContract: ContractResponse = await contractsService.createContract(data);
      
      const response: ApiResponse<ContractResponse> = {
        status: 'success',
        data: newContract,
        message: 'Contract created successfully',
      };
      
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/contracts/:id
   * Update an existing contract
   */
  public static async updateContract(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as ContractIdParams;
      const updateData: UpdateContractDto = req.body;
      
      const updatedContract: ContractResponse = await contractsService.updateContract(id, updateData);
      
      const response: ApiResponse<ContractResponse> = {
        status: 'success',
        data: updatedContract,
        message: 'Contract updated successfully',
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/contracts/:id
   * Delete a contract
   */
  public static async deleteContract(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as ContractIdParams;
      await contractsService.deleteContract(id);
      
      const response: ApiResponse = {
        status: 'success',
        message: 'Contract deleted successfully',
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/contracts/stats
   * Get contract statistics
   */
  public static async getContractStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await contractsService.getContractStats();
      
      const response: ApiResponse = {
        status: 'success',
        data: stats,
      };
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
