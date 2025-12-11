 import {
  HttpInterceptorFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

// Streamverse API base URL 
const API_BASE = 'http://localhost:5000/api/v1.0';

// Auth Token Consts 
const ACCESS_KEY = 'access_token';
const EXP_KEY = 'expiration';
const SESSION_EXPIRED_KEY = 'session_expired';

// Implemented/derived from https://angular.dev/guide/http/interceptors
export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  const accessToken = localStorage.getItem(ACCESS_KEY);

  const isApiRequest = request.url.startsWith(API_BASE);
  const isLoginRequest = request.url.endsWith('/auth/login');

  if (!isApiRequest || isLoginRequest || !accessToken) {
    return next(request);
  }

  // Set Bearer header to access the restricted parts of Streamverse 
  const authReq = request.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Session no longer valid (likely expired) – keep refresh token
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(EXP_KEY);
        localStorage.setItem(SESSION_EXPIRED_KEY, '1');
      }

      return throwError(() => error);
    })
  );
};