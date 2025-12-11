import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { buildUrl } from '../../utils/url-builder';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../../models/apiresponse';
import { Title } from '../../models/title';
import { Review } from '../../models/review';

@Injectable({
  providedIn: 'root',
})

export class WebService {
  pageSize: number = 9;
  private readonly BASE_URL = 'http://localhost:5000/api/v1.0/';

  constructor(private http: HttpClient) { };

  // Authentication
  register(username: string, fullname: string, email: string, password: string) {
    //
    const url = buildUrl(this.BASE_URL, 'auth/register')
    const body = {
      username: username,
      fullname: fullname,
      email: email,
      password: password
    }

    return this.http.post(url, body)
  }

  //
  login(username: string, password: string) {
    //
    const url = buildUrl(this.BASE_URL, 'auth/login')
    const body = {
      username: username,
      password: password
    };

    return this.http.post(url, body);
  }

  //
  logout() {
    const url = buildUrl(this.BASE_URL, 'auth/logout');
    return this.http.post(url, {});
  }

  // refresh access token using refresh_token
  refreshAccessToken(refreshToken: string) {
    const url = buildUrl(this.BASE_URL, 'auth/token/refresh');
    const body = { refresh_token: refreshToken }; // matches backend 
    return this.http.post(url, body);
  }

  // Home
  // Rating stats: GET /titles/stats/ratings
  getRatingStats() {
    const url = buildUrl(this.BASE_URL, 'titles/stats/ratings');
    return this.http.get(url);
  }

  // Genre counts: GET /titles/stats/genres?pn=&ps=&sort_order=
  getGenreCounts(page: number = 1, pageSize: number = 10, sortOrder: 'asc' | 'desc' = 'desc') {
    //
    const params = ({
      pn: page,
      ps: pageSize,
      sort_order: sortOrder,
    });

    const url = buildUrl(this.BASE_URL, "titles/stats/genres", params);
    return this.http.get(url);
  }

  // Top reviewed titles: GET /titles/stats/top-reviewed?pn=&ps=&sort_order=
  getTopReviewedTitles(page: number = 1, pageSize: number = 10, sortOrder: 'asc' | 'desc' = 'desc') {
    //
    const params = ({
      pn: page,
      ps: pageSize,
      sort_order: sortOrder,
    });

    const url = buildUrl(this.BASE_URL, "titles/stats/top-reviewed", params);
    return this.http.get(url);
  }

  //
  getTailoredRecommendations(id: string) {
    const url = buildUrl(this.BASE_URL, `titles/${id}/recommendations`)
    return this.http.get(url);
  }

  // Move to another service!
  getMoviePoster(title: string, year: number) {
    //
    const API_KEY = "291e01b9";
    const params = ({
      t: title,
      y: year,
      apikey: API_KEY
    });

    const url = buildUrl('https://www.omdbapi.com/', '', params);
    return this.http.get<any>(url);
  }

  // Titles 
  getTitles(page: number) {
    //
    const params = ({
      pn: page,
      ps: this.pageSize,
    });

    const url = buildUrl(this.BASE_URL, 'titles', params);
    return this.http.get(url);
  }

  //
  getAllTitles() {
    const url = buildUrl(this.BASE_URL, 'titles/all');
    return this.http.get(url);
  }

  //
  getTitleById(id: string): Observable<Title> {
    const url = buildUrl(this.BASE_URL, `titles/${id}`);
    return this.http.get<ApiResponse<Title>>(url)
      .pipe(map((response) => response.data));
  }

  //
  postTitle(titleData: any): Observable<any> {
    const url = buildUrl(this.BASE_URL, 'titles');
    const body = titleData;

    return this.http.post<ApiResponse<any>>(url, body)
  }

  //
  updateTitle(id: string, body: Partial<Title>): Observable<any> {
    const url = buildUrl(this.BASE_URL, `titles/${id}`);
    return this.http.put<ApiResponse<any>>(url, body)
  }

  deleteTitle(id: string): Observable<any> {
    const url = buildUrl(this.BASE_URL, `titles/${id}`);
    return this.http.delete<any>(url);
  }

  // Reviews
  getReviewsForTitle(id: string): Observable<Review[]> {
    const url = buildUrl(this.BASE_URL, `titles/${id}/reviews`);
    return this.http.get<ApiResponse<{ message: string; reviews: Review[] }>>(url)
      .pipe(map((response) => response.data.reviews ?? []));
  }

  //
  getReviewByIdForTitle(titleId: string, reviewId: string): Observable<Review> {
    const url = buildUrl(this.BASE_URL, `titles/${titleId}/reviews/${reviewId}`);
    return this.http.get<ApiResponse<Review>>(url)
      .pipe(map((response) => response.data));
  }

  //
  postReview(id: string, comment: string, rating: number): Observable<any> {
    const url = buildUrl(this.BASE_URL, `titles/${id}/reviews`);
    const body = {
      comment: comment,
      rating: rating
    };

    return this.http.post<ApiResponse<any>>(url, body)
  }

  //
  updateReview(titleId: string, reviewId: string, comment: string, rating: number) : Observable<any> {
    const url = buildUrl(this.BASE_URL, `titles/${titleId}/reviews/${reviewId}`);
    const body = {
      comment: comment,
      rating: rating
    };

    return this.http.put<ApiResponse<any>>(url, body)
  }

  //
  deleteReview(titleId: string, reviewId: string) : Observable<any> {
    const url = buildUrl(this.BASE_URL, `titles/${titleId}/reviews/${reviewId}`);
    return this.http.delete<ApiResponse<any>>(url)
  }

  // Users
  // GET /users?pn=&ps=&account_status=&user_role=&sort_by=&sort_order=
  getUsers() 
  {
    const url = buildUrl(this.BASE_URL, 'users/all');
    return this.http.get(url);
  }

  // GET /users/<username>
  getUser(username: string) {
    const url = buildUrl(this.BASE_URL, `users/${username}`);
    return this.http.get(url);
  }

  // PATCH /users/<username> – update username/fullname/email/admin
  updateUser(username: string, payload: any) {
    const url = buildUrl(this.BASE_URL, `users/${username}`);
    return this.http.patch(url, payload);
  }

  // PUT /users/<username>/resetpassword
  resetUserPassword(username: string, newPassword: string, confirmPassword: string) 
  {
    const url = buildUrl(this.BASE_URL, `users/${username}/resetpassword`);
    const body = {
      new_password: newPassword,
      confirm_password: confirmPassword,
    };
    return this.http.put(url, body);
  }

  // PATCH /users/<username>/deactivate
  deactivateUser(username: string, reason: string) {
    const url = buildUrl(this.BASE_URL, `users/${username}/deactivate`);
    const body = { reason };
    return this.http.patch(url, body);
  }

  // PATCH /users/<username>/reactivate
  reactivateUser(username: string, reason: string) {
    const url = buildUrl(this.BASE_URL, `users/${username}/reactivate`);
    const body = { reason };
    return this.http.patch(url, body);
  }

  // DELETE /users/<username>
  deleteUser(username: string) {
    const url = buildUrl(this.BASE_URL, `users/${username}`);
    return this.http.delete(url);
  }

}