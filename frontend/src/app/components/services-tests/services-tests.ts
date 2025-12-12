import { Component } from '@angular/core';
import { WebService } from '../../services/web/web-service';
import { ExternalService } from '../../services/external/external-service';

@Component({
  selector: 'app-services-tests',
  imports: [],
  providers: [WebService, ExternalService],
  templateUrl: './services-tests.html',
  styleUrl: './services-tests.css'
})
export class ServiceTests {
  
  test_output: string[] = [];
  first_title_list: any[] = [];
  second_title_list: any[] = [];
  
  constructor(
    private webService: WebService,
    private externalService: ExternalService  
  ) { }

  // Run all tests
  ngOnInit() {
    // Web Service (Tests 1-8)
    this.testTitlesFetched(); 
    this.testPagesOfTitlesAreDifferent(); 
    this.testGetTitleById(); 
    this.testGetReviewsForTitle(); 
    this.testPostReview(); 
    this.testRatingStats(); 
    this.testGenreCounts();  
    this.testTopReviewedTitles();
    // External Service (Tests 9-11)
    this.testGetMoviePosterValidMovie();
    this.testGetMoviePosterWithYear();
    this.testGetMoviePosterInvalidMovie();
  }

  // --- Web Service ---

  // Test 1: Verify that a page of titles is fetched correctly
  private testTitlesFetched() {
    this.webService.getTitles(1).subscribe( 
      (response: any) => { 
        if (response?.data?.titles && Array.isArray(response.data.titles) && response.data.titles.length === 9)
          this.test_output.push("Test 1: Page of titles fetched... PASS");
        else
          this.test_output.push("Test 1: Page of titles fetched... FAIL");
      }
    );
  }

  // Test 2: Verify that different pages return different titles
  private testPagesOfTitlesAreDifferent() {
    this.webService.getTitles(1).subscribe(
      (response: any) => {
        // Get the first pagination result
        this.first_title_list = response?.data?.titles || [];
        this.webService.getTitles(2).subscribe(
          (response: any) => {
            // Get the second pagination result
            this.second_title_list = response?.data?.titles || [];

            // Compare the results and ensure they are different
            if (this.first_title_list.length > 0 && this.second_title_list.length > 0 &&
                this.first_title_list[0]?._id !== this.second_title_list[0]?._id)
              this.test_output.push("Test 2: Pages 1 and 2 are different... PASS");
            else
              this.test_output.push("Test 2: Pages 1 and 2 are different... FAIL");
          }
        );
      },
    );
  }

  // Test 3: Fetch a specific title by ID
  private testGetTitleById() {
    this.webService.getAllTitles().subscribe(
      (response: any) => {
        // Get all the titles
        const titles = response?.data || [];
        const testId = titles[0]._id;
        const testTitle = titles[0].title;
        
        // Get the title by ID
        this.webService.getTitleById(testId).subscribe(
          (title: any) => {
            // Compare the results
            if (title && title.title === testTitle)
              this.test_output.push("Test 3: Fetch title by ID... PASS");
            else
              this.test_output.push("Test 3: Fetch title by ID... FAIL");
          }
        );
      }
    );
  }

  // Test 4: Fetch reviews for a specific title
  private testGetReviewsForTitle() {
    this.webService.getAllTitles().subscribe(
      (response: any) => {
        // Get all the titles
        const titles = response?.data || [];
        const testId = titles[0]._id;
        
        // Get all the reviews for the title
        this.webService.getReviewsForTitle(testId).subscribe(
          (reviews: any) => {
            // Ensure the result is an Array
            if (Array.isArray(reviews))
              this.test_output.push("Test 4: Fetch reviews for title... PASS");
            else
              this.test_output.push("Test 4: Fetch reviews for title... FAIL (Not an array)");
          }
        );
      }
    );
  }

  // Test 5: Post a new review
  private testPostReview() {
    this.webService.getAllTitles().subscribe(
      (response: any) => {
        // Get title
        const titles = response?.data || [];
        const testId = titles[0]._id;
        
        // Get initial review count
        this.webService.getReviewsForTitle(testId).subscribe(
          (initialReviews: any) => {
            const initialCount = initialReviews.length;
            
            // Post a test review
            this.webService.postReview(testId, "Test review comment", 4).subscribe(
              (postResponse: any) => {
                // Verify the review was added
                this.webService.getReviewsForTitle(testId).subscribe(
                  (updatedReviews: any) => {
                    if (updatedReviews.length === initialCount + 1)
                      this.test_output.push("Test 5: Post review... PASS");
                    else
                      this.test_output.push("Test 5: Post review... FAIL (Review count mismatch)");
                  }
                );
              },
            );
          }
        );
      }
    );
  }

  // Test 6: Fetch rating statistics
  private testRatingStats() {
    this.webService.getRatingStats().subscribe(
      (response: any) => {
        //Get the rating stats for the titles and compare the result
        if (response && typeof response === 'object')
          this.test_output.push("Test 6: Fetch rating stats... PASS");
        else
          this.test_output.push("Test 6: Fetch rating stats... FAIL");
      }
    );
  }

  // Test 7: Fetch genre counts
  private testGenreCounts() {
    this.webService.getGenreCounts(1, 10).subscribe(
      (response: any) => {
        //Get the rating stats for the titles and compare the result
        if (response && typeof response === 'object')
          this.test_output.push("Test 7: Fetch genre counts... PASS");
        else
          this.test_output.push("Test 7: Fetch genre counts... FAIL");
      }
    );
  }

  // Test 8: Fetch top reviewed titles
  private testTopReviewedTitles() {
    this.webService.getTopReviewedTitles(1, 10).subscribe(
      (response: any) => {
        //Get the rating stats for the titles and compare the result
        if (response && typeof response === 'object')
          this.test_output.push("Test 8: Fetch top reviewed titles... PASS");
        else
          this.test_output.push("Test 8: Fetch top reviewed titles... FAIL");
      }
    );
  }

  // --- External Service ---

  // Test 9: Fetch movie poster for a valid movie
  private testGetMoviePosterValidMovie() {
    this.externalService.getMoviePoster("The Matrix", 1999).subscribe(
      (response: any) => {
        //Get the response from the OMDb API and compare the result
        if (response && response.Response === "True" && response.Poster && response.Poster !== "N/A")
          this.test_output.push("Test 9: Fetch movie poster (The Matrix)... PASS");
        else if (response && response.Response === "False")
          this.test_output.push("Test 9: Fetch movie poster (The Matrix)... FAIL (OMDb API returned: " + response.Error + ")");
        else
          this.test_output.push("Test 9: Fetch movie poster (The Matrix)... FAIL (No poster found)");
      }
    );
  }

  // Test 10: Fetch movie poster with year parameter
  private testGetMoviePosterWithYear() {
    this.externalService.getMoviePoster("Inception", 2010).subscribe(
      (response: any) => {
        //Get the response from the OMDb API and compare the result
        if (response && response.Response === "True" && response.Year === "2010")
          this.test_output.push("Test 10: Fetch movie poster with year (Inception 2010)... PASS");
        else if (response && response.Response === "False")
          this.test_output.push("Test 10: Fetch movie poster with year (Inception 2010)... FAIL (OMDb returned: " + response.Error + ")");
        else
          this.test_output.push("Test 10: Fetch movie poster with year (Inception 2010)... FAIL (Year mismatch or no data)");
      }
    );
  }

  // Test 11: Handle invalid movie 
  private testGetMoviePosterInvalidMovie() {
    this.externalService.getMoviePoster("ThisMovieDefinitelyDoesNotExist12345XYZ", 9999).subscribe(
      (response: any) => {
        //Get the response from the OMDb API and compare the result
        if (response && response.Response === "False" && response.Error)
          this.test_output.push("Test 11: Handle invalid movie... PASS");
        else
          this.test_output.push("Test 11: Handle invalid movie... FAIL");
      }
    );
  }
}