import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'  
})

//
export class CacheService {
  private cache: { [key: string]: string } = {};

  //
  get(titleId: string): string | null {
    return this.cache[titleId] || null;
  }

  //
  set(titleId: string, posterUrl: string): void {
    this.cache[titleId] = posterUrl;
  }

  //
  has(titleId: string): boolean {
    return !!this.cache[titleId];
  }
}