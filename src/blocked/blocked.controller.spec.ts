import { Test, TestingModule } from '@nestjs/testing';
import { BlockedController } from './blocked.controller';

describe('BlockedController', () => {
  let controller: BlockedController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlockedController],
    }).compile();

    controller = module.get<BlockedController>(BlockedController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
