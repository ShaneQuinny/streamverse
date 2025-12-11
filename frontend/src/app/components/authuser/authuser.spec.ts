import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Authuser } from './authuser';

describe('Authuser', () => {
  let component: Authuser;
  let fixture: ComponentFixture<Authuser>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Authuser]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Authuser);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
