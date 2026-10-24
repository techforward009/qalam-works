"use client";
import {useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';

type Screen = {scale:number;x:(pageX:number)=>number;y:(pageY:number)=>number};
/** Paint strokes outside the CSS-scaled sheet: fractional CSS widths inside it
 * are rounded by layout before scaling (a 2/3px caret becomes a 3px stroke).
 * Keep positions aligned to the physical pixel grid after scrolling as well. */
export function StudioScreenOverlay({zoom,children,zIndex=4}:{zoom:number;children:(screen:Screen)=>ReactNode;zIndex?:number}){
 const marker=useRef<HTMLSpanElement>(null);
 const [screen,setScreen]=useState<{host:HTMLElement;scale:number;left:number;top:number;dpr:number}|null>(null);
 useLayoutEffect(()=>{
  const surface=marker.current?.closest<HTMLElement>('[data-studio-zoom-surface]'),host=surface?.parentElement;
  if(!surface||!host)return;
  let frame=0;
  const measure=()=>{const rect=surface.getBoundingClientRect(),natural=parseFloat(surface.style.width),scale=rect.width/natural||zoom;
   const next={host,scale,left:rect.left,top:rect.top,dpr:window.devicePixelRatio||1};
   setScreen(prev=>prev&&prev.host===host&&prev.scale===scale&&prev.left===rect.left&&prev.top===rect.top&&prev.dpr===next.dpr?prev:next);
  };
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);};
  measure();const ro=new ResizeObserver(schedule);ro.observe(surface);ro.observe(host);
  window.addEventListener('resize',schedule);document.addEventListener('scroll',schedule,true);
  return()=>{ro.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);document.removeEventListener('scroll',schedule,true);};
 },[zoom]);
 return <><span ref={marker} hidden/>{screen?createPortal(<div className="studio-no-print pointer-events-none absolute inset-0" style={{zIndex}}>{children({scale:screen.scale,
  x:value=>Math.round((screen.left+value*screen.scale)*screen.dpr)/screen.dpr-screen.left,
  y:value=>Math.round((screen.top+value*screen.scale)*screen.dpr)/screen.dpr-screen.top})}</div>,screen.host):null}</>;
}
