import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TitleDataGrid } from './title-data-grid';

describe('TitleDataGrid', () => {
  let component: TitleDataGrid;
  let fixture: ComponentFixture<TitleDataGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TitleDataGrid]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TitleDataGrid);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
