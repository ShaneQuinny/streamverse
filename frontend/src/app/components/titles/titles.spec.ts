import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Titles } from './titles';

describe('Titles', () => {
  let component: Titles;
  let fixture: ComponentFixture<Titles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Titles]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Titles);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
