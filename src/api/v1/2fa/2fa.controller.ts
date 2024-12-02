import { Controller } from '@nestjs/common';
import { TwofaService } from './2fa.service';

@Controller('2fa')
export class TwofaController {
  constructor(private readonly TwofaService: TwofaService) {}
}
