import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  // We export TypeOrmModule to make the User repository available to other modules
  // that import the UsersModule.
  exports: [TypeOrmModule],
})
export class UsersModule {}
