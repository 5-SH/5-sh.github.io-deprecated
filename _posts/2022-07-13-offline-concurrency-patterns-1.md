---
layout: post
title: 오프라인 동시성 패턴 (1)
date: 2022-07-13 15:30:00 + 0900
categories: Patterns
ref: Patterns, concurrency, lock
---

# 오프라인 동시성 패턴 (1)
## 1. 낙관적 오프라인 잠금
충돌이 감지되면 트랜잭션을 롤백해 동시 비즈니스 트랜잭션 간의 충돌을 방지한다.

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/178661312-4ea92dbb-d330-45bd-a166-1e42d4e70da0.jpg" width="75%"/>
</figure>

### 1-1
비즈니스 트랜잭션은 여러 시스템 트랜잭션을 거쳐 실행되는 경우가 많습니다.   
비즈니스 트랜잭션이 시스템 트랜잭션 범위를 벗어나면 데이터베이스의 도움만으로   
레코드 데이터를 일관된 상태로 유지할 수 없습니다.   
   
낙관적 오프라인 잠금은 한 세션에서 커밋하려는 변경 내용이 다른 세션의 변경 내용과    
충돌하지 않는지 확인하는 방법으로 이 문제를 해결합니다.    
   
낙관적 오프라인 잠금은 세션 충돌 가능성이 낮다고 간주하고    
여러 사용자가 동시에 동일한 데이터를 가지고 작업하도록 허용합니다.   
하지만 비즈니스 트랜잭션이 커밋될 것인지 여부를    
마지막 시스템 트랜잭션이 되어서야 알려줍니다.
   
세션 충돌의 가능성이 높을 것으로 예상되면 시스템의 동시성을 제한하는    
비관적 오프라인 잠금을 사용하는 것이 낫습니다.

### 1-2
낙관적 오프라인 잠금은 세션이 레코드를 로드한 이후    
다른 세션이 이를 변경하지 않은 것을 확인함으로써 획득할 수 있습니다.    
   
낙관적 오프라인 잠금을 구현하는 가장 일반적인 방법은 각 레코드에 버전 번호를 연결하는 것 입니다.   
낙관적 오프라인 잠금을 얻는다는 것은 __세션 데이터에 저장된 버전을    
레코드 데이터의 현재 버전과 비교하는 것__ 을 의미합니다.   
   
레코드 데이터의 현재 버전과 세션 데이터에 저장된 버전이 같다면   
레코드 데이터에 대한 변경을 진행해도 좋다는 의미의 잠금을 얻는 것 입니다.    
이 과정을 __유효성 검사__ 라고 부릅니다.    
   
유효성 검사가 성공하면 버전 증가를 비롯한 모든 변경을 커밋할 수 있습니다.    
버전 증가는 인전 버전을 가진 세션이 잠금을 얻을 수 없게 함으로써    
레코드 데이터의 일관성을 보호합니다.   

### 1-3
RDBMS 를 사용하는 경우 유효성 검사는 레코드 업데이트 또는 삭제하는 쿼리문에   
조건을 추가하는 것으로 구현할 수 있습니다.   
쿼리문 하나에서 잠금을 얻고 레코드 데이터를 업데이트 할 수 있습니다.   
    
그리고 쿼리문 실행 결과로 반환된 행 카운트를 검사해 0인 경우   
비즈니스 트랜잭션은 시스템 트랜잭션을 롤백해 변경사항이 레코드 데이터에 적용되지 않게 합니다.    
    
각 레코드에 버전 번호와 함께 마지막으로 수정한 사용자와 시간에 대한 정보를 저장하면   
동시성 충돌을 관리하는데 요유용하게 사용할 수 있습니다.    

### 1-4
UPDATE 와 DELETE 쿼리에 버전을 추가하는 방법을 많이 사용하지만,   
이 경우 일관성 없는 읽기 문제가 발생할 수 있습니다.   
   
청구서를 생성하고 소비세를 계산하는 청구 시스템을 예로 들면,   
한 세션이 청구서를 생성하고 세금을 계산하기 위해 해당 고객의 주소를 조회하는 동안   
별도의 고객 유지 관리 세션이 고객의 주소를 편집할 수 있습니다.   
   
세율은 고객의 주소지에 따라 다르므로 청구서 생셩 세션이 계산한 세율이 틀릴 수 있습니다.   
그러나 청구서 생성 세션은 UPDATE 또는 DELETE 쿼리를 사용하지 않았기 때문에   
주소지 레코드에 대한 충돌을 감지하지 못합니다.   
   
비즈니스 로직에서 고객의 주소 값이 중요하다는 것을 알았다면,   
주소를 변경 집합에 추가하거나 버전 검사를 수행할 항목의 목록을 별도로 유지하는 등의 방법으로   
중요한 값에 대한 버전 검사를 추가로 수행해야 합니다.   
   
버전 검사를 수행할 때,    
UPDATE 또는 DELETE 쿼리가 아니라 SELECT 쿼리로 버전을 다시 읽는 방법을 사용해 검사하는 경우    
시스템 트랜잭션 격리 수준을 REPEATABLE READ 이상으로 설정해야 합니다.   

### 1-5. 구현 (1)
낙관적 오프라인 잠금에 대한 예제로 버전 열을 포함하는 데이터베이스 테이블 하나와    
업데이트 조건의 일부로 버전 정보를 사용하는 UPDATE, DELETE 쿼리를 구현합니다.   

CUSTOMER 예제 테이블의 구조는 아래와 같습니다.   

| id | name | createdby | created | modifiedby | modified | version |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| BIGINT | VARCHAR(50) | VARCHAR(50) | DATETIME | VARCHAR(50) | DATETIME | INT |

전체 예제 코드는 아래 링크를 확인해 주세요.   
[낙관적 오프라인 잠금 전체 예제 코드](https://github.com/5-SH/enterprise_application_architecture/tree/master/src/offline_concurrency/optimistic_offline_lock)

### 1-6. 구현 (2)
먼저, 도메인 객체의 상위 객체에 낙관적 오프라인 잠금을 구현하는데 필요한 모든 정보를 저장합니다.   

```java
package offline_concurrency.optimistic_offline_lock;

import java.sql.Timestamp;

public class DomainObject {
  private Long id;
  private Timestamp modified;
  private String modifiedBy;
  private int version;

  public DomainObject() {}

  public DomainObject(Long id) { this.id = id; }

  ...

  public void setSystemFields(Timestamp modified, String modifiedBy, int version) {
    this.modified = modified;
    this.modifiedBy = modifiedBy;
    this.version = version;
  }
}
```

그리고 데이터 접근은 데이터 매퍼 패턴을 사용합니다.   
한 비즈니스 트랜잭션 내에서 다른 시점에 다른 버전의 객체가 로드되면,    
예기치 않은 에러가 발생할 수 있기 때문에 매퍼는 객체가 미리 로드되지 않았는지 확인합니다.    

```java
// AppSessionManager.java
package offline_concurrency.optimistic_offline_lock;

import java.util.HashMap;
import java.util.Map;

public class AppSessionManager {
  private static AppSessionManager soleInstance = new AppSessionManager();
  protected Map<Long, DomainObject> identityMap;

  public AppSessionManager() {
    identityMap = new HashMap();
  }

  private static AppSessionManager getInstance() { return soleInstance; }

  public static void initialize() { soleInstance = new AppSessionManager(); }

  public static AppSessionManager getSession() { return soleInstance; }

  public Map getIdentityMap() {
    return identityMap;
  }
}

```

```java
// AbstractMapper.java
public abstract class AbstractMapper {
  private String table;
  private String[] colmuns;

  private String loadSQL;
  private String deleteSQL;
  private String insertSQL;
  private String updateSQL;

  protected Connection db;
  protected final String checkVersionSQL ="SELECT version, modifiedBy, modified FROM customer WHERE id = ?";

  public AbstractMapper(String table, String[] columns) {
    this.table = table;
    this.colmuns = columns;
    buildStatements();

    try {
      Class.forName("com.mysql.jdbc.Driver");
      Properties props = new Properties();
      props.put("user", "root");
      props.put("password", "root");
      props.put("characterEncoding", "UTF-8");
      String url = "jdbc:mysql://localhost/architecture";
      this.db = DriverManager.getConnection(url, props);
    } catch(ClassNotFoundException | SQLException e){
      e.printStackTrace();
    }
  }

  public DomainObject find(Long id) {
    DomainObject obj = (DomainObject) AppSessionManager.getSession().getIdentityMap().get(id);
    if (obj == null) {
      try {
        PreparedStatement stmt = db.prepareStatement(loadSQL);
        stmt.setLong(1, id.longValue());
        ResultSet rs = stmt.executeQuery();
        if (rs.next()) {
          obj = load(id, rs);
          String modifiedBy = rs.getString(colmuns.length + 3);
          Timestamp modified = rs.getTimestamp(colmuns.length + 4);
          int version = rs.getInt(colmuns.length + 5);
          obj.setSystemFields(modified, modifiedBy, version);
          AppSessionManager.getSession().getIdentityMap().put(id, obj);
        } else {
          throw new Exception(table + " " + id + " does not exist");
        }
      } catch (Exception e) {
        e.printStackTrace();
      }
    }
    return obj;
  }

  protected abstract DomainObject load(Long id, ResultSet rs) throws SQLException;

  ...

  public void delete(DomainObject object) {
    AppSessionManager.getSession().getIdentityMap().remove(object.getId());
    try {
      PreparedStatement stmt = db.prepareStatement(deleteSQL);
      stmt.setLong(1, object.getId().longValue());
      stmt.setInt(2, object.getVersion());        // (2)
      int rowCount = stmt.executeUpdate();
      if (rowCount == 0) {
        throwConcurrencyException(object);
      }
    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  ...

  public void update(DomainObject object) {
    Timestamp now = new Timestamp(System.currentTimeMillis());
    int curVersion = object.getVersion();
    int newVersion = curVersion + 1;
    try {
      PreparedStatement stmt = db.prepareStatement(updateSQL);
      stmt.setLong(1, object.getId().longValue());
      doUpdate(object, stmt);
      stmt.setString(3, "admin");
      stmt.setTimestamp(4, now);
      stmt.setInt(5, newVersion);
      stmt.setInt(6, curVersion);                 // (2)
      int rowCount = stmt.executeUpdate();
      if (rowCount == 0) {
        throwConcurrencyException(object);
      } else {
        object.setSystemFields(now, "admin", newVersion);
        AppSessionManager.getSession().getIdentityMap().put(object.getId(), object);
      }
    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  ...
  
  protected void throwConcurrencyException(DomainObject object) throws Exception {
    try {
      PreparedStatement stmt = db.prepareStatement(checkVersionSQL);
      stmt.setInt(1, (int) object.getId().longValue());
      ResultSet rs = stmt.executeQuery();
      if (rs.next()) {
        int version = rs.getInt(1);
        String modifiedBy = rs.getString(2);
        Timestamp modified = rs.getTimestamp(3);
        if (version > object.getVersion()) {      // (1)
          String when = DateFormat.getDateInstance().format(modified);
          throw new Exception(table + " " + object.getId() + " modified by " + modifiedBy + " at " + when);
        } else if (version < object.getVersion()) {
          throw new Exception("unexpected error checking timestamp");
        }
      } else {
        throw new Exception(table + " " + object.getId() + " has been deleted");
      }
    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  ...

  private void buildStatements() {
    int columnsLength = colmuns.length;

    this.loadSQL = "SELECT * FROM " + this.table + " WHERE id = ?";

    this.deleteSQL = "DELETE FROM " + this.table + " WHERE id =? and version = ?";  // (3)

    this.insertSQL = "INSERT INTO " + this.table + " VALUES (";
    StringBuffer buffer = new StringBuffer();
    for (int i = 0; i < columnsLength + 5; i++) {
      buffer.append("?, ");
    }
    buffer.setLength(buffer.length() - 2);
    this.insertSQL += (buffer.toString() + ");");

    this.updateSQL = "UPDATE " + this.table + " SET ";
    buffer = new StringBuffer();
    for (int i = 0; i < columnsLength; i++) {
      buffer.append(this.colmuns[i] + " = ?,");
    }
    buffer.append("modifiedby = ?,");
    buffer.append("modified = ?,");
    buffer.append("VERSION = ? ");
    buffer.append("WHERE version = ?");           // (3)
    buffer.setLength(buffer.length());
    this.updateSQL += (buffer.toString() + ";");
  }
}

```

__(1)__   
AbstractMapper 의 throwConcurrencyExcption 함수에서 __if (version > obejct.getVersion())__ 부분이   
낙관적 오프라인 잠금의 유효성을 검사하는 부분 입니다.   

__(2)__
그리고 update 와 delete 함수에서 세션에 저장된 도메인 객체의 버전과 레코드 버전을 비교하기 위해    
쿼리의 파라미터로 curVersion 을 넘기고 있습니다.   

__(3)__
updateSQL, deleteSQL 에서 쿼리문을 보면 레코드에 저장된 version 과 비교하는 조건을    
where 절에서 확인할 수 있습니다.     

__변경 내용을 커밋하는 특정 시스템 트랜잭션 내에서 낙관적 오프라인 잠금을 획득해야   
레코드 데이터의 일관성을 유지할 수 있습니다.__