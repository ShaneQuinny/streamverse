import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { buildUrl } from "../../utils/url-builder";
import { Observable, map } from "rxjs";
import { ApiResponse } from "../../interfaces/apiresponse";
import { Title } from "../../interfaces/title";
import { Review } from "../../interfaces/review";

@Injectable({
  providedIn: "root",
})
/**
 * WebService acts as the service or the "connector" between the StreamVerse 
 * Angular front-end and the Flask REST API
 *
 * The service is organised into 6 sections:
 * - Audit logs (view, filter, statistics, and pruning)
 * - Authentication (login, register, logout)
 * - Home stats (ratings, genres, top-reviewed titles, recommendations)
 * - Titles (CRUD and list endpoints)
 * - Reviews (CRUD per title)
 * - Users (admin management and account status)
 *
 */
export class WebService {
  /**
   * Default page size used for paginated title listings in the StreamVerse FE.
   */
  pageSize: number = 9;

  /**
   * Base URL for the StreamVerse backend API.
   * All relative endpoint paths are built on top of this value.
   */
  private readonly BASE_URL = "http://localhost:5000/api/v1.0/";

  constructor(private http: HttpClient) {}

  // --- Audit Logs (Admin) ---

  /**
   * Retrieves all audit logs (unfiltered).
   *
   * Request: GET /audit/all
   *
   * @returns An observable of the full audit logs collection.
   */
  getAllAuditLogs() {
    const url = buildUrl(this.BASE_URL, "audit/all");
    return this.http.get(url);
  }

  /**
   * Retrieves paginated and filtered audit logs.
   *
   * Request: GET /audit?pn=&ps=&admin=&action=&sort_by=&sort_order=
   *
   * @param page The page number to request (default: 1).
   * @param pageSize Number of records per page (default: 10).
   * @param admin Optional admin filter (username or "all", default: "all").
   * @param action Optional action type filter (or "all", default: "all").
   * @param sortBy Field to sort by (default: "timestamp").
   * @param sortOrder Sort direction, `"asc"` or `"desc"` (default: `"desc"`).
   * @returns An observable of the filtered audit logs response.
   */
  getAuditLogs(
    page: number = 1,
    pageSize: number = 10,
    admin: string = "all",
    action: string = "all",
    sortBy: string = "timestamp",
    sortOrder: "asc" | "desc" = "desc"
  ) {
    const params = {
      pn: page,
      ps: pageSize,
      admin,
      action,
      sort_by: sortBy,
      sort_order: sortOrder,
    };
    const url = buildUrl(this.BASE_URL, "audit", params);
    return this.http.get(url);
  }

  /**
   * Fetches a single audit log entry by its ID.
   *
   * Request: GET /audit/<log_id>
   *
   * @param logId The unique identifier of the audit log entry.
   * @returns An observable of the audit log details.
   */
  getAuditLogById(logId: string) {
    const url = buildUrl(this.BASE_URL, `audit/${logId}`);
    return this.http.get(url);
  }

  /**
   * Retrieves aggregated audit statistics.
   *
   * Request: GET /audit/stats
   *
   * @returns An observable of the audit statistics payload.
   */
  getAuditStats() {
    const url = buildUrl(this.BASE_URL, "audit/stats");
    return this.http.get(url);
  }

  /**
   * Prunes audit logs older than a given number of days.
   *
   * Request: DELETE /audit/prune?days=<days>
   *
   * @param days Logs older than this number of days will be removed (default: 90).
   * @returns An observable of the prune-audit-logs HTTP response.
   */
  pruneAuditLogs(days: number = 90) {
    const params = { days };
    const url = buildUrl(this.BASE_URL, "audit/prune", params);
    return this.http.delete(url);
  }

  // --- Authentication ---

  /**
   * Registers a new StreamVerse user.
   *
   * Request: POST /auth/register
   * 
   * @param username The username for the new account.
   * @param fullname The user"s full name.
   * @param email The user"s email address.
   * @param password The chosen password.
   * @returns An observable of the registration HTTP response.
   */
  register(
    username: string, 
    fullname: string, 
    email: string, 
    password: string
  ) {
    const url = buildUrl(this.BASE_URL, "auth/register");
    const body = {
      username: username,
      fullname: fullname,
      email: email,
      password: password,
    };

    return this.http.post(url, body);
  }

  /**
   * Logs a user into StreamVerse using username and password.
   *
   * Request: POST /auth/login
   * 
   * @param username The login username.
   * @param password The login password.
   * @returns An observable of the login HTTP response with the access token
   */
  login(
    username: string, 
    password: string
  ) {
    const url = buildUrl(this.BASE_URL, "auth/login");
    const body = {
      username: username,
      password: password,
    };

    return this.http.post(url, body);
  }

  /**
   * Logs out the current user from the Streamverse API session.
   *
   * The FE will also clear local tokens via AuthService and TokenStorageService.
   * 
   * Request: POST /auth/logout
   *
   * @returns An observable of the HTTP response.
   */
  logout() {
    const url = buildUrl(this.BASE_URL, "auth/logout");
    return this.http.post(url, {});
  }

  // --- Home / Title Stats ---

  /**
   * Fetches aggregate rating stats for titles.
   *
   * Request: GET /titles/stats/ratings
   *
   * @returns An observable of the HTTP reponse.
   */
  getRatingStats() {
    const url = buildUrl(this.BASE_URL, "titles/stats/ratings");
    return this.http.get(url);
  }

  /**
   * Fetches paginated counts of titles grouped by genre.
   *
   * Request: GET /titles/stats/genres?pn=&ps=&sort_order=
   *
   * @param page The page number to request (default: 1).
   * @param pageSize The number of items per page (default: 10).
   * @param sortOrder The sort direction for counts (`"asc"` or `"desc"`, default: `"desc"`).
   * @returns An observable of the genre statistics response.
   */
  getGenreCounts(
    page: number = 1,
    pageSize: number = 10,
    sortOrder: "asc" | "desc" = "desc"
  ) {
    const params = {
      pn: page,
      ps: pageSize,
      sort_order: sortOrder,
    };

    const url = buildUrl(this.BASE_URL, "titles/stats/genres", params);
    return this.http.get(url);
  }

  /**
   * Fetches a paginated list of the most reviewed titles.
   *
   * Request: GET /titles/stats/top-reviewed?pn=&ps=&sort_order=
   *
   * @param page The page number to request (default: 1).
   * @param pageSize The number of items per page (default: 10).
   * @param sortOrder Sort direction based on review count (`"asc"` or `"desc"`, default: `"desc"`).
   * @returns An observable of the top-reviewed titles response.
   */
  getTopReviewedTitles(
    page: number = 1,
    pageSize: number = 10,
    sortOrder: "asc" | "desc" = "desc"
  ) {
    const params = {
      pn: page,
      ps: pageSize,
      sort_order: sortOrder,
    };

    const url = buildUrl(this.BASE_URL, "titles/stats/top-reviewed", params);
    return this.http.get(url);
  }

  /**
   * Fetches tailored recommendations for a given title.
   *
   * Request: GET /titles/<id>/recommendations
   *
   * @param id The unique identifer of the title to fetch recommendations.
   * @returns An observable of the recommendation response.
   */
  getTailoredRecommendations(id: string) {
    const url = buildUrl(this.BASE_URL, `titles/${id}/recommendations`);
    return this.http.get(url);
  }

  // --- Titles ---

  /**
   * Fetches a paginated list of titles.
   *
   * Request: GET /titles?pn=&ps=
   *
   * @param page The page number to request.
   * @returns An observable of the titles response for that page.
   */
  getTitles(page: number) {
    const params = {
      pn: page,
      ps: this.pageSize,
    };

    const url = buildUrl(this.BASE_URL, "titles", params);
    return this.http.get(url);
  }

  /**
   * Retrieves all titles without pagination.
   *
   * Request: GET /titles/all
   *
   * @returns An observable containing the full titles collection.
   */
  getAllTitles() {
    const url = buildUrl(this.BASE_URL, "titles/all");
    return this.http.get(url);
  }

  /**
   * Fetches a single title by its ID.
   *
   * Request: GET /titles/<id>
   *
   * @param id The unqiue identifier of the title to fetch.
   * @returns An observable of the title interface.
   */
  getTitleById(id: string): Observable<Title> {
    const url = buildUrl(this.BASE_URL, `titles/${id}`);
    return this.http.get<ApiResponse<Title>>(url).pipe(
      map((response) => response.data)
    );
  }

  /**
   * Creates a new title in the system.
   *
   * Request: POST /titles
   *
   * @param titleData The payload describing the new title.
   * @returns An observable of the HTTP response.
   */
  postTitle(titleData: any): Observable<any> {
    const url = buildUrl(this.BASE_URL, "titles");
    const body = titleData;

    return this.http.post<ApiResponse<any>>(url, body);
  }

  /**
   * Updates an existing title.
   *
   * Request: PUT /titles/<id>
   *
   * @param id The unique identifier of the title to update.
   * @param body A partial Title interface containing fields to update.
   * @returns An observable of the HTTP response.
   */
  updateTitle(
    id: string, 
    body: Partial<Title>
  ): Observable<any> {
    const url = buildUrl(this.BASE_URL, `titles/${id}`);
    return this.http.put<ApiResponse<any>>(url, body);
  }

  /**
   * Deletes a title from the system.
   *
   * Request: DELETE /titles/<id>
   *
   * @param id The unique identifier of the title to delete.
   * @returns An observable of the HTTP response.
   */
  deleteTitle(id: string): Observable<any> {
    const url = buildUrl(this.BASE_URL, `titles/${id}`);
    return this.http.delete<any>(url);
  }

  // --- Reviews ---

  /**
   * Retrieves all reviews for a given title.
   *
   * Request: GET /titles/<id>/reviews
   *
   * @param id The unique identifier of the title whose reviews should be fetched.
   * @returns An observable array of Review interfaces (empty if none).
   */
  getReviewsForTitle(id: string): Observable<Review[]> {
    const url = buildUrl(this.BASE_URL, `titles/${id}/reviews`);
    return this.http
      .get<ApiResponse<{ message: string; reviews: Review[] }>>(url)
      .pipe(map((response) => response.data.reviews ?? []));
  }

  /**
   * Retrieves a single review for a specific title by its review ID.
   *
   * Request: GET /titles/<titleId>/reviews/<reviewId>
   *
   * @param titleId The unique identifier of the parent title.
   * @param reviewId The unique identifier of the review to fetch.
   * @returns An observable of the Review interface.
   */
  getReviewByIdForTitle(
    titleId: string,
    reviewId: string
  ): Observable<Review> {
    const url = buildUrl(
      this.BASE_URL,
      `titles/${titleId}/reviews/${reviewId}`
    );
    return this.http.get<ApiResponse<Review>>(url).pipe(
      map((response) => response.data)
    );
  }

  /**
   * Creates a new review for a title.
   *
   * Request: POST /titles/<id>/reviews
   *
   * @param id The unique identifier of the title being reviewed.
   * @param comment The review text/comment.
   * @param rating The numeric rating given by the user.
   * @returns An observable of the HTTP response.
   */
  postReview(
    id: string, 
    comment: string, 
    rating: number
  ): Observable<any> {
    const url = buildUrl(this.BASE_URL, `titles/${id}/reviews`);
    const body = {
      comment: comment,
      rating: rating,
    };

    return this.http.post<ApiResponse<any>>(url, body);
  }

  /**
   * Updates an existing review for a given title.
   *
   * Request: PUT /titles/<titleId>/reviews/<reviewId>
   *
   * @param titleId The unique identifier of the parent title.
   * @param reviewId The unique identifier of the review to update.
   * @param comment The updated review text.
   * @param rating The updated rating value.
   * @returns An observable of the HTTP response.
   */
  updateReview(
    titleId: string,
    reviewId: string,
    comment: string,
    rating: number
  ): Observable<any> {
    const url = buildUrl(
      this.BASE_URL,
      `titles/${titleId}/reviews/${reviewId}`
    );
    const body = {
      comment: comment,
      rating: rating,
    };

    return this.http.put<ApiResponse<any>>(url, body);
  }

  /**
   * Deletes a review for a given title.
   *
   * Request: DELETE /titles/<titleId>/reviews/<reviewId>
   *
   * @param titleId The unique identifier of the parent title.
   * @param reviewId The unique identifier of the review to delete.
   * @returns An observable of the HTTP response.
   */
  deleteReview(
    titleId: string, 
    reviewId: string
  ): Observable<any> {
    const url = buildUrl(this.BASE_URL, `titles/${titleId}/reviews/${reviewId}`);
    return this.http.delete<ApiResponse<any>>(url);
  }

  // Users (Admin)

  /**
   * Retrieves all users in the system.
   *
   * Request: GET /users/all
   *
   * @returns An observable of the HTTP response.
   */
  getUsers() {
    const url = buildUrl(this.BASE_URL, "users/all");
    return this.http.get(url);
  }

  /**
   * Retrieves a single user by username.
   *
   * Request: GET /users/<username>
   *
   * @param username The username of the user to retrieve.
   * @returns An observable of the HTTP response.
   */
  getUser(username: string) : Observable<any> {
    const url = buildUrl(this.BASE_URL, `users/${username}`);
    return this.http.get(url);
  }

  /**
   * Updates user details such as username, fullname, email and admin flag.
   *
   * Request: PATCH /users/<username>
   *
   * @param username The original username of the user to update.
   * @param payload A partial interface containing the fields to be updated.
   * @returns An observable of the HTTP response.
   */
  updateUser(
    username: string, 
    userData: any
  ): Observable<any> {
    const url = buildUrl(this.BASE_URL, `users/${username}`);
    return this.http.patch(url, userData);
  }

  /**
   * Resets a user"s password.
   *
   * Request: PUT /users/<username>/resetpassword
   *
   * @param username The username of the account to reset.
   * @param newPassword The new password value.
   * @param confirmPassword Confirmation of the new password.
   * @returns An observable of the HTTP response.
   */
  resetUserPassword(
    username: string,
    newPassword: string,
    confirmPassword: string
  ): Observable<any> {
    const url = buildUrl(this.BASE_URL, `users/${username}/resetpassword`);
    const body = {
      new_password: newPassword,
      confirm_password: confirmPassword,
    };
    return this.http.put(url, body);
  }

  /**
   * Deactivates a user account, providing a reason.
   *
   * Request: PATCH /users/<username>/deactivate
   *
   * @param username The username of the account to deactivate.
   * @param reason A short explanation for the deactivation.
   * @returns An observable of the HTTP response.
   */
  deactivateUser(
    username: string, 
    reason: string
  ): Observable<any> {
    const url = buildUrl(this.BASE_URL, `users/${username}/deactivate`);
    const body = { reason };
    return this.http.patch(url, body);
  }

  /**
   * Reactivates a previously deactivated user account.
   *
   * Request: PATCH /users/<username>/reactivate
   *
   * @param username The username of the account to reactivate.
   * @param reason A short explanation for the reactivation.
   * @returns An observable of the HTTP response.
   */
  reactivateUser(
    username: string, 
    reason: string
  ) {
    const url = buildUrl(this.BASE_URL, `users/${username}/reactivate`);
    const body = { reason };
    return this.http.patch(url, body);
  }

  /**
   * Permanently deletes a user account.
   *
   * Request: DELETE /users/<username>
   *
   * @param username The username of the account to delete.
   * @returns An observable of the HTTP response.
   */
  deleteUser(username: string) {
    const url = buildUrl(this.BASE_URL, `users/${username}`);
    return this.http.delete(url);
  }
}