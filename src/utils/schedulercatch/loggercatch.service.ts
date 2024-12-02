import { Inject, Logger } from '@nestjs/common';
export function logErrorDecorator(bubble = true) {
  const injectLogger = Inject(Logger);

  return (
    target: any,
    propertyKey: string,
    propertyDescriptor: PropertyDescriptor,
  ) => {
    injectLogger(target, 'logger'); // this is the same as using constructor(private readonly logger: LoggerService) in a class

    //get original method
    const originalMethod = propertyDescriptor.value;

    //redefine descriptor value within own function block
    propertyDescriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        console.log(error.message);
        // rethrow error, so it can bubble up
        if (bubble) {
          throw error;
        }
      }
    };
  };
}
