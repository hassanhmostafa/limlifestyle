import { beforeEach, expect, it, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/mysql-proxy';
import { getTableColumns } from 'drizzle-orm';
import { eventProfiles } from '../drizzle/schema';
import { getDb } from './db';
import { requireOpenEvent, defaultEventProfile, eventReportPage } from './eventAdminDb';
vi.mock('./db',()=>({getDb:vi.fn(),getEventReadingByRecordNo:vi.fn()}));
let rows:unknown[][]=[];
let queries:{sql:string,params:unknown[]}[]=[];
beforeEach(()=>{
 rows=[];queries=[];
 vi.mocked(getDb).mockResolvedValue(drizzle(async(sql,params)=>{queries.push({sql,params});return {rows};}) as never);
});
it('enforces saved event closure while retaining read access to the profile',async()=>{
 const row={...defaultEventProfile,closed:1};
 rows=[Object.keys(getTableColumns(eventProfiles)).map(k=>row[k as keyof typeof row])];
 await expect(requireOpenEvent()).rejects.toThrow('انتهى التسجيل');
 rows=[Object.keys(getTableColumns(eventProfiles)).map(k=>({...row,closed:0})[k as keyof typeof row])];
 await expect(requireOpenEvent()).resolves.toMatchObject({closed:0});
 expect(queries[0].params).toContain('lim-events');
});
it('scopes report rows to the event and cursor without exporting browser tokens',async()=>{
 await eventReportPage(55,20);
 expect(queries[0].sql).toContain('`event_participant_sessions`.`eventCode` = ?');
 expect(queries[0].params).toContain('lim-events');
 expect(queries[0].params).toContain(55);
 expect(queries[0].sql).not.toContain('accessTokenHash');
});
