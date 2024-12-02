import { ExecutionContext } from '@nestjs/common';

export function requestFromContext(context: ExecutionContext) {
  if (context.getType() === 'http') {
    return context.switchToHttp().getRequest();
  } else if (context.getType() === 'ws') {
    return context.switchToWs().getClient();
  }
}