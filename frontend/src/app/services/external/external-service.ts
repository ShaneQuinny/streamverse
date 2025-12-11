import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { buildUrl } from "../../utils/url-builder";

@Injectable({
  providedIn: 'root',
})

/**
 * ExternalService for interacting with external third-party APIs.
 *
 * Currently used to query the OMDb API for movie details such as posters.
 * This service is separate from the StreamVerse backend and should be used
 * only for external data retrieval, not internal application calls.
 */
export class ExternalService {
  
  /**
  * Base URL for the StreamVerse backend API.
  * All relative endpoint paths are built on top of this value.
  */
  private readonly BASE_URL = "https://www.omdbapi.com/";

  /**
  * API Key required to access the omb API 
  */
  private readonly API_KEY = "291e01b9";

  /**
  * Creates an instance of the service and injects Angular's HttpClient.
  *
  * The HttpClient is used to perform HTTP requests to backend or external APIs
  * throughout this service.
  *
  * @param http The Angular HttpClient used for making HTTP requests.
  */
  constructor(private http: HttpClient) {}

  /**
  * Fetches a movie poster from the OMDb API based on title and year.
  *
  * This is an external API call, separate from the StreamVerse backend.
  *
  * @param title The movie title to search for.
  * @param year The movie release year to narrow the search.
  * @returns An observable of the OMDb raw response.
  */
  getMoviePoster(
    title: string, 
    year: number
  ) {
    const params = {
      t: title,
      y: year,
      apikey: this.API_KEY,
    };

    const url = buildUrl(this.BASE_URL, "", params);
    return this.http.get<any>(url);
  }
}