import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestWebService } from './services-tests';

describe('TestWebService', () => {
  let component: TestWebService;
  let fixture: ComponentFixture<TestWebService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestWebService]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestWebService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
