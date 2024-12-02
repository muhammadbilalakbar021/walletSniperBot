import { Injectable } from '@nestjs/common';

@Injectable()
export class ConsoleService {
  print(message: any) {
    console.log(message);
  }
}
