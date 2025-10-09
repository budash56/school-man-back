import { Module } from '@nestjs/common';
import { REPOSITORY_PROVIDERS } from '.';

@Module({
  providers: [...REPOSITORY_PROVIDERS],
  exports: [...REPOSITORY_PROVIDERS],
})
export class RepositoriesModule {}
