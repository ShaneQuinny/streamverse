import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * The Streamverse API Base URL used to construct URL paths 
 */
const API_BASE = 'http://localhost:5000/api/v1.0';

/**
 * The storage key used for saving the user's access token in the local storage
 */ 
const ACCESS_KEY = 'access_token';

/**
 * The storage key used for saving the user's access token expiration timestamp 
 * in the local storage
 */ 
const EXP_KEY = 'expiration';

/**
 * This utility interceptor automatically attaches the user's JWT Bearer access token
 * to outgoing API requests calling the StreamVerse API, ensuring that authenticated 
 * endpoints receive the required JWT Bearer access token.
 *
 * @param request The outgoing HTTP request before modification.
 * @param next The next handler in the interceptor chain.
 *
 * @returns An observable of the HTTP response with the Authorization header applied.
 * 
 */
export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  const accessToken = localStorage.getItem(ACCESS_KEY);

  const isApiRequest = request.url.startsWith(API_BASE);
  const isLoginRequest = request.url.endsWith('/auth/login');

  // If request is none of the above, continue to the next request
  if (!isApiRequest || isLoginRequest || !accessToken) {
    return next(request);
  }

  // Set Bearer header to access the restricted parts of Streamverse 
  const authReq = request.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // Gets the next request in queue. If the backend returns a 401 (indicating token expiration)
  // it removes the access token from the local storage and requires the user to login in again
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(EXP_KEY);
      }
      return throwError(() => error);
    })
  );
};