import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { clearBookSourceCache, readBookSource } from '../app/api/khateeb/library/sourceCache';
import { loadBookSource, type BookCatalog } from '../app/api/khateeb/library/store';
vi.mock('../app/api/khateeb/library/store',()=>({loadBookSource:vi.fn()}));
const client={putObject:async()=>{},getObject:async()=>null,listObjects:async()=>[]};
const catalog=(revision='one')=>({revision,manifest:{format:'qalam-foundational-corpus',version:1,sources:[],recordCount:0},paths:{}} as BookCatalog);
beforeEach(()=>{clearBookSourceCache();vi.mocked(loadBookSource).mockReset();vi.mocked(loadBookSource).mockResolvedValue([])});
afterEach(()=>vi.useRealTimers());
it('coalesces concurrent and repeated reads while separating imported revisions',async()=>{
 await Promise.all([readBookSource(client,catalog(),'nahj-ar'),readBookSource(client,catalog(),'nahj-ar')]);expect(loadBookSource).toHaveBeenCalledTimes(1);
 await readBookSource(client,catalog('two'),'nahj-ar');expect(loadBookSource).toHaveBeenCalledTimes(2);
});
it('retries failed reads rather than caching errors',async()=>{
 vi.mocked(loadBookSource).mockRejectedValueOnce(new Error('unavailable'));
 await expect(readBookSource(client,catalog(),'nahj-ar')).rejects.toThrow('unavailable');await readBookSource(client,catalog(),'nahj-ar');expect(loadBookSource).toHaveBeenCalledTimes(2);
});
it('expires and bounds source entries',async()=>{
 vi.useFakeTimers();await readBookSource(client,catalog(),'nahj-ar');vi.advanceTimersByTime(300001);await readBookSource(client,catalog(),'nahj-ar');expect(loadBookSource).toHaveBeenCalledTimes(2);
 for(let i=0;i<8;i++) await readBookSource(client,catalog(`revision-${i}`),'nahj-ar');await readBookSource(client,catalog('revision-0'),'nahj-ar');expect(loadBookSource).toHaveBeenCalledTimes(11);
});
