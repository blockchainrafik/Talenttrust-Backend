import { Request, Response, NextFunction } from 'express';
import { ContractResponse, ContractListResponse } from '../modules/contracts/dto/contract.dto';

const mockGetContracts = jest.fn();
const mockGetContractById = jest.fn();
const mockCreateContract = jest.fn();
const mockUpdateContract = jest.fn();
const mockDeleteContract = jest.fn();
const mockGetContractStats = jest.fn();

jest.mock('../services/contracts.service', () => {
  return {
    ContractsService: jest.fn().mockImplementation(() => {
      return {
        getContracts: mockGetContracts,
        getContractById: mockGetContractById,
        createContract: mockCreateContract,
        updateContract: mockUpdateContract,
        deleteContract: mockDeleteContract,
        getContractStats: mockGetContractStats,
      };
    }),
  };
});

import { ContractsController } from './contracts.controller';

describe('ContractsController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    
    // Clear all mocks
    mockGetContracts.mockClear();
    mockGetContractById.mockClear();
    mockCreateContract.mockClear();
    mockUpdateContract.mockClear();
    mockDeleteContract.mockClear();
    mockGetContractStats.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getContracts', () => {
    it('should return contracts list successfully', async () => {
      const mockContractsData: ContractListResponse = {
        contracts: [
          {
            id: 'contract-1',
            title: 'Test Contract',
            description: 'A test contract',
            clientId: 'client-1',
            freelancerId: null,
            budget: 1000,
            deadline: null,
            status: 'PENDING',
            terms: null,
            milestones: null,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockRequest.query = { page: '1', limit: '10' };
      mockGetContracts.mockResolvedValue(mockContractsData);

      await ContractsController.getContracts(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockContractsData,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors and call next()', async () => {
      const mockError = new Error('Database error');
      mockRequest.query = {};
      mockGetContracts.mockRejectedValue(mockError);

      await ContractsController.getContracts(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(mockError);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('getContractById', () => {
    it('should return contract when found', async () => {
      const mockContract: ContractResponse = {
        id: 'contract-1',
        title: 'Test Contract',
        description: 'A test contract',
        clientId: 'client-1',
        freelancerId: null,
        budget: 1000,
        deadline: null,
        status: 'PENDING',
        terms: null,
        milestones: null,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      mockRequest.params = { id: 'contract-1' };
      mockGetContractById.mockResolvedValue(mockContract);

      await ContractsController.getContractById(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockContract,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 when contract not found', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockGetContractById.mockResolvedValue(null);

      await ContractsController.getContractById(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        error: 'Contract not found',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors and call next()', async () => {
      const mockError = new Error('Database error');
      mockRequest.params = { id: 'contract-1' };
      mockGetContractById.mockRejectedValue(mockError);

      await ContractsController.getContractById(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(mockError);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('createContract', () => {
    it('should create contract successfully', async () => {
      const mockContract: ContractResponse = {
        id: 'contract-1',
        title: 'Test Contract',
        description: 'A test contract',
        clientId: 'client-1',
        freelancerId: null,
        budget: 1000,
        deadline: null,
        status: 'PENDING',
        terms: null,
        milestones: null,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      mockRequest.body = {
        title: 'Test Contract',
        description: 'A test contract',
        clientId: 'client-1',
        budget: 1000,
      };
      mockCreateContract.mockResolvedValue(mockContract);

      await ContractsController.createContract(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockContract,
        message: 'Contract created successfully',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors and call next()', async () => {
      const mockError = new Error('Creation failed');
      mockRequest.body = {};
      mockCreateContract.mockRejectedValue(mockError);

      await ContractsController.createContract(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(mockError);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('updateContract', () => {
    it('should update contract successfully', async () => {
      const mockContract: ContractResponse = {
        id: 'contract-1',
        title: 'Updated Contract',
        description: 'An updated test contract',
        clientId: 'client-1',
        freelancerId: null,
        budget: 1500,
        deadline: null,
        status: 'ACTIVE',
        terms: null,
        milestones: null,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z',
      };

      mockRequest.params = { id: 'contract-1' };
      mockRequest.body = {
        title: 'Updated Contract',
        budget: 1500,
        status: 'ACTIVE',
      };
      mockUpdateContract.mockResolvedValue(mockContract);

      await ContractsController.updateContract(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockContract,
        message: 'Contract updated successfully',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors and call next()', async () => {
      const mockError = new Error('Update failed');
      mockRequest.params = { id: 'contract-1' };
      mockRequest.body = {};
      mockUpdateContract.mockRejectedValue(mockError);

      await ContractsController.updateContract(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(mockError);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('deleteContract', () => {
    it('should delete contract successfully', async () => {
      mockRequest.params = { id: 'contract-1' };
      mockDeleteContract.mockResolvedValue(undefined);

      await ContractsController.deleteContract(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Contract deleted successfully',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors and call next()', async () => {
      const mockError = new Error('Delete failed');
      mockRequest.params = { id: 'contract-1' };
      mockDeleteContract.mockRejectedValue(mockError);

      await ContractsController.deleteContract(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(mockError);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('getContractStats', () => {
    it('should return contract statistics successfully', async () => {
      const mockStats = {
        total: 5,
        byStatus: {
          PENDING: 2,
          ACTIVE: 2,
          COMPLETED: 1,
          CANCELLED: 0,
          DISPUTED: 0,
        },
        totalBudget: 10000,
      };

      mockGetContractStats.mockResolvedValue(mockStats);

      await ContractsController.getContractStats(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockStats,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors and call next()', async () => {
      const mockError = new Error('Stats error');
      mockGetContractStats.mockRejectedValue(mockError);

      await ContractsController.getContractStats(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(mockError);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});
