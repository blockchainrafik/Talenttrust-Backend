import { ContractsService } from './contracts.service';

describe('ContractsService', () => {
  let contractsService: ContractsService;

  beforeEach(() => {

    // In our implementation, ContractsService instantiates its own SorobanService.
    // By mocking the module, instances will be mocked automatically.
    contractsService = new ContractsService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllContracts', () => {
    it('should return an empty array initially', async () => {
      const contracts = await contractsService.getAllContracts();
      expect(contracts).toEqual([]);
    });
  });

  describe('createContract', () => {
    it('should create a contract', async () => {
      const contractData = {
        title: 'Build a frontend',
        description: 'React TS development',
        budget: 500
      };

      const result = await contractsService.createContract(contractData);

      expect(result).toMatchObject({
        title: 'Build a frontend',
        description: 'React TS development',
        budget: 500,
        status: 'PENDING'
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
    });
  });
});
