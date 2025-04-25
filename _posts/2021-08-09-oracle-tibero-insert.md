---
layout: post
title: 티베로(오라클)에서 row 가 있으면 update 없으면 insert 하는 쿼리
date: 2021-08-09 10:30:00 +0900
categories: [db]
tags: [db]
---

# 티베로(오라클)에서 row 가 있으면 update 없으면 insert 하는 쿼리

## AS-IS
티베로(오라클)에서 row 가 있는지 select 문으로 확인 후 없으면 insert 문 실행.

```java
Connection conn = DriverManager.getConnection(url, username, password);
conn.setAutoCommit(true);

PreparedStatement countStmt = conn.prepareStatement("SELECT COUNT(1) as count FROM blah WHERE id = ?");
countStmt.setLong(1, id);
ResultSet rs = countStmt.executeQuery();

rs.next();
long count = rs.getLong("count");

if (count < 1) {
  PreparedStatement insertStmt = conn.prepareStatement("INSERT INTO blah (id, name) VALUES (?, ?)");
  insertStmt.setLong(1, id);
  insertStmt.setString(2, name);
  insertStmt.executeUpdate();
} else {
  PreparedStatement insertStmt = conn.prepareStatement("UPDATE blah SET name=? WHERE id=?");
  insertStmt.setString(1, name);
  insertStmt.setLong(2, id);
  insertStmt.executeUpdate();
}
```

## TO-BE
티베로(오라클)의 MERGE 를 사용해 쿼리 하나로 해결

```java
Connection conn = DriverManager.getConnection(url, username, password);
conn.setAutoCommit(true);

String sql = "MERGE INTO blah"
            + "USING DUAL ON (id=?) "
            + "WHEN MATCHED THEN "
            + "UPDATE SET name=? "
            + "WHEN NOT MATCHED THEN "
            + "INSERT (id, name) "
            + "VALUES (?, ?)";
PreparedStatement stmt = conn.prepareStatement(sql);

stmt.setLong(1, id);
stmt.setString(2, name);
stmt.setLong(3, id);
stmt.setString(4, name);
stmt.executeUpdate();
```