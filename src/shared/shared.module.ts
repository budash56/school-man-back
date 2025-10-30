import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../repositories/repositories.module';
import { AccessService } from '../auth/access.service';

@Module({
  imports: [RepositoriesModule],
  providers: [AccessService],
  exports: [AccessService],
})
export class SharedModule {}
