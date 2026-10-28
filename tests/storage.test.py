import sqlite3, unittest

SCHEMA='''CREATE TABLE tournaments(owner_id TEXT PRIMARY KEY,revision INTEGER NOT NULL,payload TEXT NOT NULL,updated_at TEXT NOT NULL);CREATE TABLE operations(owner_id TEXT NOT NULL,operation_id TEXT NOT NULL,fingerprint TEXT NOT NULL,revision INTEGER NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(owner_id,operation_id));'''
UPDATE='UPDATE tournaments SET revision=?,payload=?,updated_at=? WHERE owner_id=? AND revision=? AND NOT EXISTS (SELECT 1 FROM operations WHERE owner_id=? AND operation_id=?)'
INSERT='INSERT INTO operations (owner_id,operation_id,fingerprint,revision,created_at) SELECT ?,?,?,?,? WHERE changes()=1'
class StorageTests(unittest.TestCase):
 def setUp(self):
  self.db=sqlite3.connect(':memory:');self.db.executescript(SCHEMA);self.db.execute('INSERT INTO tournaments VALUES (?,?,?,?)',('a',0,'{}','now'));self.db.commit()
 def apply(self,expected,op,payload='new',fingerprint='scoreA+1'):
  with self.db:
   cursor=self.db.execute(UPDATE,(expected+1,payload,'now','a',expected,'a',op));changed=cursor.rowcount
   self.db.execute(INSERT,('a',op,fingerprint,expected+1,'now'))
  return changed
 def test_score_and_operation_commit_together(self):
  self.assertEqual(self.apply(0,'id-1'),1);self.assertEqual(self.db.execute('SELECT revision,payload FROM tournaments').fetchone(),(1,'new'));self.assertEqual(self.db.execute('SELECT count(*) FROM operations').fetchone()[0],1)
 def test_same_operation_does_not_apply_twice(self):
  self.apply(0,'id-1');self.assertEqual(self.apply(1,'id-1','duplicate'),0);self.assertEqual(self.db.execute('SELECT revision,payload FROM tournaments').fetchone(),(1,'new'))
 def test_stale_revision_cannot_overwrite_score(self):
  self.apply(0,'id-1','score1');self.assertEqual(self.apply(0,'id-2','score2'),0);self.assertEqual(self.db.execute('SELECT payload FROM tournaments').fetchone()[0],'score1');self.assertEqual(self.db.execute('SELECT count(*) FROM operations').fetchone()[0],1)
 def test_owner_isolation(self):
  self.db.execute('INSERT INTO tournaments VALUES (?,?,?,?)',('b',0,'other','now'));self.db.commit();self.apply(0,'id-1');self.assertEqual(self.db.execute('SELECT revision,payload FROM tournaments WHERE owner_id=?',('b',)).fetchone(),(0,'other'))
if __name__=='__main__':unittest.main()
