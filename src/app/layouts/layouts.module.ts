import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutsComponent } from './layouts.component';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [LayoutsComponent],
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  exports: [LayoutsComponent],
})
export class LayoutsModule {}
