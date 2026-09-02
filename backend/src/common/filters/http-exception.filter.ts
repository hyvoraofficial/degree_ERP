import { 
  ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger 
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = 
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage = 'An unexpected server error occurred.';
    let errorDetails: any = null;

    if (exception instanceof HttpException) {
      const responseBody = exception.getResponse() as any;
      errorCode = exception.name || 'HTTP_EXCEPTION';
      errorMessage = typeof responseBody === 'string' ? responseBody : responseBody.message || exception.message;
      
      // Extract detailed validation errors from class-validator
      if (status === HttpStatus.BAD_REQUEST && responseBody && typeof responseBody === 'object' && responseBody.message) {
        errorCode = 'VALIDATION_ERROR';
        errorDetails = responseBody.message;
      }
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
      this.logger.error(
        `Unhanded Error: ${exception.message}`,
        exception.stack
      );
    }

    // Format human-readable message from validation details if present
    let displayMessage = errorMessage;
    if (Array.isArray(errorDetails) && errorDetails.length > 0) {
      displayMessage = errorDetails.join(', ');
    } else if (typeof errorDetails === 'string' && errorDetails.trim()) {
      displayMessage = errorDetails;
    }

    // Log request failure context
    this.logger.warn(
      `[${request.method}] ${request.url} - Status ${status} - Error: ${displayMessage}`
    );

    response.status(status).json({
      success: false,
      error: {
        code: errorCode,
        message: displayMessage,
        details: errorDetails,
      },
    });
  }
}
