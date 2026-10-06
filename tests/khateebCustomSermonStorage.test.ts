// @vitest-environment happy-dom
import { beforeEach, expect, test, vi } from 'vitest';
import { createCustomSermonProject, parseCustomSermonProject, customSermonProjectKey } from '../app/tools/khateeb-studio/engine/customSermonProject';
import { buildCustomBackup, prepareCustomRestore, persistRestoredProjects, loadCustomProjects, CUSTOM_SERMON_ACTIVE_KEY } from '../app/tools/khateeb-studio/engine/customSermonStorage';
const draft = () => createCustomSermonProject({ kind: 'majlis', title: 'صبر', objective: 'عمل', ownMaterial: 'میرے نوٹس', duration: 30 });
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
test('loads the last active draft, ignores damaged records, and keeps their original bytes', () => {
 const a=draft(), b=draft(); persistRestoredProjects(localStorage,[a,b]); localStorage.setItem(CUSTOM_SERMON_ACTIVE_KEY,a.id); localStorage.setItem(customSermonProjectKey('broken'),'bad');
 const loaded=loadCustomProjects(localStorage); expect(loaded.projects).toHaveLength(2); expect(loaded.activeId).toBe(a.id); expect(loaded.invalidCount).toBe(1); expect(localStorage.getItem(customSermonProjectKey('broken'))).toBe('bad');
});
test('backup roundtrip is exact and repeated restore is idempotent', () => {
 const a=draft(); const restored=prepareCustomRestore(buildCustomBackup([a]),[]); expect(restored.added).toEqual([a]); expect(prepareCustomRestore(buildCustomBackup([a]),restored.projects).added).toEqual([]);
});
test('an older backup preserves the current draft and adds a separate version', () => {
 const a=draft(), newer={...a,ownMaterial:'نئی تبدیلی'}; const restored=prepareCustomRestore(buildCustomBackup([a]),[newer]); expect(restored.projects.find(p=>p.id===a.id)).toEqual(newer); expect(restored.added[0].ownMaterial).toBe(a.ownMaterial); expect(restored.added[0].id).not.toBe(a.id);
});
test.each(['null','{}','{"type":"qalam-khateeb-custom-sermons","version":1,"projects":[]}'])('rejects invalid backup %s', raw => { expect(()=>prepareCustomRestore(raw,[])).toThrow(); });
test('rejects a whole backup when any project is malformed', () => { expect(()=>prepareCustomRestore(buildCustomBackup([draft(),{...draft(),sections:[]}]),[])).toThrow(); });
test('rolls back imported records on storage quota failure without affecting existing drafts', () => {
 const existing=draft(),a=draft(),b=draft(); persistRestoredProjects(localStorage,[existing]); const original=localStorage.setItem.bind(localStorage); vi.spyOn(localStorage,'setItem').mockImplementation((key,value)=>{ if(key===customSermonProjectKey(b.id))throw Error('quota'); original(key,value); });
 expect(()=>persistRestoredProjects(localStorage,[a,b])).toThrow(); expect(localStorage.getItem(customSermonProjectKey(a.id))).toBeNull(); expect(loadCustomProjects(localStorage).projects).toEqual([existing]);
});
test('parser rejects missing metadata, invalid timings and malformed nested fields', () => {
 const a=draft(); for(const patch of [{updatedAt:null},{selectedEvidenceIds:null},{kind:'wrong'},{duration:25},{sections:[{...a.sections[0],userText:4}]},{sections:[{...a.sections[0],minutes:30,evidenceIds:['missing']}]}])expect(parseCustomSermonProject(JSON.stringify({...a,...patch}))).toBeNull();
 expect(parseCustomSermonProject(JSON.stringify({...a,title:'',objective:''}))).toBeTruthy();
});
