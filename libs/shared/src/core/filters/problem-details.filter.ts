import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<any>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail = 'An unexpected error occurred on the server.';
    let type = 'https://tools.ietf.org/html/rfc7231#section-6.6.1';
    let errors: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resContent: any = exception.getResponse();
      title = exception.message || 'HTTP Exception';
      detail = typeof resContent === 'string' ? resContent : resContent.message || detail;
      
      if (typeof resContent === 'object' && resContent.error) {
        title = resContent.error;
      }
      if (typeof resContent === 'object' && Array.isArray(resContent.message)) {
        errors = resContent.message;
        detail = 'One or more validation errors occurred.';
      }

      type = `https://tools.ietf.org/html/rfc7231#section-6.${status.toString().startsWith('4') ? '5' : '6'}`;
    } else if (exception instanceof Error) {
      detail = exception.message;
      if (exception.name === 'PrismaClientKnownRequestError') {
        status = HttpStatus.BAD_REQUEST;
        title = 'Database Request Error';
        type = 'https://tools.ietf.org/html/rfc7231#section-6.5.1';
      }
    }

    // Set standard RFC 7807 content type
    response.setHeader('Content-Type', 'application/problem+json');
    response.status(status).json({
      type,
      title,
      status,
      detail,
      instance: request.url,
      errors,
      timestamp: new Date().toISOString()
    });
  }
}
