import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Authbutton } from './authbutton';

describe('Authbutton', () => {
  let component: Authbutton;
  let fixture: ComponentFixture<Authbutton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Authbutton]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Authbutton);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
