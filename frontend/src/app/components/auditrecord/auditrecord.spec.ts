import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditRecord } from './auditrecord';

describe('Auditrecord', () => {
  let component: Auditrecord;
  let fixture: ComponentFixture<Auditrecord>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Auditrecord]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Auditrecord);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
