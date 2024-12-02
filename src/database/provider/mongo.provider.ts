import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '../../config/config.module';
import { ConfigService } from '../../config/config.service';
import { print } from '../utils/log';
import { JwtEntity, JwtSchema } from '../../api/v1/auth/entity/jwt.entity';
import {
  AccountSchema,
  AccountEntity,
} from '../../api/v1/account/entity/account.entity';
import {
  AdminAccountEntity,
  AdminAccountSchema,
} from '../../api/v1/account/entity/adminAccount.entity';
import {
  TokenEntity,
  TokenSchema,
} from '../../api/v1/web3/entity/token.entity';
import {
  TokenTransactionEntity,
  TokenTransactionSchema,
} from '../../api/v1/web3/entity/token_transactions.entity';
import {
  RadiumWalletEntity,
  RadiumWalletSchema,
} from '../../api/v1/web3/entity/radium_wallets.entity';
import { WalletEntity, WalletSchema } from '../../api/v1/web3/entity/wallet.entity';
import { UserTransactionEntity, UserTransactionSchema } from '../../api/v1/web3/entity/user_transactions.entity';

let MongoDataBaseProvider;
try {
  MongoDataBaseProvider = [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.MONGO_CLUSTER_URI,
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
    }),
    MongooseModule.forFeature([
      { name: AccountEntity.name, schema: AccountSchema },
      { name: JwtEntity.name, schema: JwtSchema },
      { name: AdminAccountEntity.name, schema: AdminAccountSchema },
      { name: TokenEntity.name, schema: TokenSchema },
      { name: TokenTransactionEntity.name, schema: TokenTransactionSchema },
      { name: RadiumWalletEntity.name, schema: RadiumWalletSchema },
      { name: WalletEntity.name, schema: WalletSchema },
      { name: UserTransactionEntity.name, schema: UserTransactionSchema },

    ]),
  ];
  print('Mongo Db Connected');
} catch (error) {
  print('Mongo Db Not Connected');
}
export default MongoDataBaseProvider;
