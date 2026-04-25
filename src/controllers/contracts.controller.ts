import { Request, Response, NextFunction } from 'express';
import { ContractsService } from '../services/contracts.service';
import { ContractRepository } from '../repositories/contractRepository';
import { getDb } from '../db/database';
import { CreateContractDto } from '../modules/contracts/dto/contract.dto';

const contractsService = new ContractsService(new ContractRepository(getDb()));

/**
 * @dev Presentation layer for Contracts.
 * Handles HTTP requests, extracts parameters, and formulates responses.
 * Delegates core logic to the ContractsService.
 */
export class ContractsController {
  
  /**
   * GET /api/v1/contracts
   * Fetch a list of all escrow contracts (includes version field).
   */
  public static async getContracts(req: Request, res: Response, next: NextFunction) {
    try {
      const contracts = await contractsService.getAllContracts();
      res.status(200).json({ status: 'success', data: contracts });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/contracts/:id
   * Fetch a single contract by ID (includes version field).
   */
  public static async getContractById(req: Request, res: Response, next: NextFunction) {
    try {
      const contract = await contractsService.getContractById(req.params.id);
      if (!contract) {
        res.status(404).json({ status: 'error', error: { code: 'not_found', message: 'Not found' } });
        return;
      }
      res.status(200).json({ status: 'success', data: contract });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/contracts
   * Create a new escrow contract metadata entry.
   */
  public static async createContract(req: Request, res: Response, next: NextFunction) {
    try {
      const data: CreateContractDto = req.body;
      const newContract = await contractsService.createContract(data);
      res.status(201).json({ status: 'success', data: newContract });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/contracts/:id
   * Update an existing contract using Optimistic Concurrency Control.
   * Requires `version` in the request body to detect conflicts.
   * On version mismatch the service throws VersionConflictError which the
   * global errorHandler maps to 409 ERR_CONFLICT automatically.
   */
  public static async updateContract(req: Request, res: Response, next: NextFunction) {
    try {
      const contract = await contractsService.updateContract(req.params.id, req.body);
      res.status(200).json({ status: 'success', data: contract });
    } catch (error) {
      next(error);
    }
  }
}
