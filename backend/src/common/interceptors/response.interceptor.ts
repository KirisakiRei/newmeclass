import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && ('success' in (data as Record<string, unknown>) || 'data' in (data as Record<string, unknown>))) {
          return data;
        }
        return {
          success: true,
          message: 'OK',
          data,
        };
      }),
    );
  }
}
