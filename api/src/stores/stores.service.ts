import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from './store.entity';

@Injectable()
export class StoresService {
  constructor(@InjectRepository(Store) private readonly stores: Repository<Store>) {}

  async findOrFail(id: string): Promise<Store> {
    const store = await this.stores.findOneBy({ id });
    if (!store) {
      throw new NotFoundException({ message: 'Loja não encontrada.', details: { storeId: id } });
    }
    return store;
  }
}
