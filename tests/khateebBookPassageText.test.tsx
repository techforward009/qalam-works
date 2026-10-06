// @vitest-environment happy-dom
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { expect, it, afterEach } from 'vitest';
import BookPassageText from '../app/tools/khateeb-studio/BookPassageText';
afterEach(cleanup);
it('keeps Urdu in its own font while marking a quoted Arabic passage separately',()=>{
 const {container}=render(<BookPassageText language='ur' text='یہ صبر کی دو قسمیں ہیں: «اَلصَّبْرُ صَبْرَانِ»'/>);
 expect(container.querySelector('.khateeb-book-ur')?.getAttribute('dir')).toBe('rtl');expect(container.querySelector('.font-vazirmatn')).toBeNull();expect(container.querySelector('.khateeb-muhammadi-quranic')?.getAttribute('lang')).toBe('ar');
});
it('explicit Arabic and English language metadata controls rendering and direction',()=>{
 const {container,rerender}=render(<BookPassageText language='ar' text='اَلصَّبْرُ صَبْرَانِ'/>);expect(container.querySelector('.khateeb-muhammadi-quranic')).not.toBeNull();rerender(<BookPassageText language='en' text='Patience (55)'/>);expect(container.querySelector('[lang=en]')?.getAttribute('dir')).toBe('ltr');expect(container.textContent).toBe('Patience (55)');
});
