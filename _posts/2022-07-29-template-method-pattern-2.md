---
layout: post
title: 템플릿 메소드(콜백) 패턴 (2)
date: 2022-07-29 19:30:00 + 0900
categories: [patterns]
tags: [patterns, template, method, spring, jdbc]
---

# 템플릿 메소드(콜백) 패턴 (2)

## 2. 템플릿 메소드 패턴 적용 과정

### 2-1. 문제점
JDBC 를 활용한 DAO 를 작성하면 같은 함수가 매번 같은 순서로 호출되고 예외처리 코드가 중복됩니다.   

```java
class UserDao {
  ...
  public void deleteAll() throws SQLException {
    Connection c = null;
    PreparedStatement ps = null;

    try {
      c = dataSoure.getConnection();
      ps = c.prepareStatement("delete from users");
      ps.executeUpdate();
    } catch (SQLException e) {
      throw e;
    } finally {
      if (ps != null) {
        try {
          ps.close();
        } catch (SQLException e) {
        }
      }
      if (c != null) {
        try {
          c.close();
        } catch (SQLException e) {
        }
      }
    }
  }

  public void deleteUser(string userId) throws SQLException {
    ...
    try {
      c = dataSoure.getConnection();
      ps = c.prepareStatement("delete from users where userid=" + userId);
      ps.executeUpdate();
    } catch (SQLException e) {
      throw e;
    } finally 
     ... 
  }

  public void insertUser(User user) throws SQLException {
    ...
    try {
      c = dataSoure.getConnection();
      ps = c.prepareStatement(
        "insert into users values (" 
          + user.userId + ", "
          + user.userName + ", "
          + user.age + ")"
        );
      ps.executeUpdate();
    } catch (SQLException e) {
      throw e;
    } finally 
     ... 
  }
  ...
}
```

### 2-2. 적용 (1)
중복되는 코드를 재사용하고 기능 추가, 수정을 쉽게하기 위해 템플릿 메소드 패턴을 사용합니다.   
우선 변하는 부분과 변하지 않는 부분을 나눕니다.    
DataSource 에서 커넥션을 가져와 쿼리를 실행하고 예외를 처리하는 부분은 변하지 않는 부분입니다.    
그리고 preparedStatement 에 담아 처리할 쿼리는 변하는 부분 입니다.   

템플릿 메소드 패턴은 상속을 통해 기능을 확장해서 사용합니다.   
변하지 않는 부분은 슈퍼클래스에 두고 변하는 부분은 추상 메소드로 정의하고    
서브클래스에서 오버라이드해 새롭게 정의해 쓰도록 합니다.   

```java
abstract class UserDao {
  private DataSource dataSource;

  public void setDataSource(DataSource dataSource) {
    this.dataSource = dataSource;
  }

  public void deleteAll() throws SQLException {
    ...
    try {
      c = dataSource.getConnection();
      ps = makeStatement(c);
      ps.executeUpdate();
    } catch (SQLExcption e)
    ... 
  }

  abstract protected PreparedStatement makeStatement(Connection c) throws SQLException;
}

public class UserDaoDeleteAll extends UserDao {
  protected PreparedStatement makeStatement(Connection c) throws SQLException {
    return c.preparedStatement("delete from users");
  }
}

public class UserDaoDeleteUser extends UserDao {
  private userId = null;

  void setUserId(String userId) {
    this.userId = userId;
  }

  protected PreparedStatement makeStatement(Connection c) throws SQLException {
    return c.preparedStatement("delete from users where user=" + this.userId);
  }
}

public class UserDaoInsert extends UserDao {
  private User user = null;

  void setUser(User user) {
    this.user = user;
  }

  protected PreparedStatement makeStatement(Connection c) throws SQLException {
    return c.preparedStatement(
        "insert into users values (" 
          + user.userId + ", "
          + user.userName + ", "
          + user.age + ")"
        );
  }
}
```

하지만 이 구조는 DAO 로직 마다 상속을 통해 새로운 클래스를 만들어야 하는 단점이 있습니다.
그리고 확장구조가 클래스를 설계하는 시점에서 고정되어 유연성이 떨어집니다.

### 2-3. 적용 (2)
오브젝트를 아예 둘로 분리하고 클래스 레벨에서는 인터페이스를 통해서만 의존하도록 전략 패턴을 사용해   
템플릿 메소드 패턴의 단점을 보완합니다.   

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/181700806-6a10e32d-b352-432d-bfe2-fd3e4036cc49.png" width="100%"/>
</figure>

컨텍스트(Context) 는 PreparedStatement 를 실행하는 JDBC 의 작업 흐름이고   
전략(Strategy)은 PreparedStatement 를 생성하는 것 입니다.   

그리고 모든 DAO 에서 JDBC 코드를 사용할 수 있도록 독립시켜 보겠습니다.

```java
public interface StatementStrategy {
  PreparedStatement makePreparedStatement(Connection c) throws SQLException;
}

public class JdbcContext {
  private DataSource dataSource;

  public void setDataSource(DataSource dataSource) {
    this.dataSource = dataSource;
  }

  public void workWithStatementStrategy(StatementStrategy stmt) throws SQLException {
    Connection c = null;
    PreparedStatement ps = null;

    try {
      c = this.dataSource.getConnection();
      ps = stmt.makePreparedStatement(c);
      ps.executeUpdate();
    } catch (SQLException e) {
      throw e;
    } finally {
      if (ps != null) { try { ps.close(); } catch (SQLException e) {} }
      if (c != null) { try { c.close(); } catch (SQLException e) {} }
    }
  }
}

public class UserDao {
  class DeleteAllStrategy implements StatementStrategy {
    public PreparedStatement makePreapredStatement(Connection c) throws SQLExcpetion {
      return c.preparedStatement("delete from users");
    }
  }
  ...
  private JdbcContext jdbcContext;
  private StatementStrategy deleteAllStrategy = new DeleteAllStrategy();



  public void setDataSource(DataSource dataSource) {
    this.jdbcContext = new JdbcContext();
    this.jdbcContext.setDatasource(dataSource);
  }

  public void deleteAll() throws SQLException {
    this.jdbcContext.workWithStatementStrategy(this.deleteAllStrategy);
  }
  ...
}
```

이 방법은 DAO 메소드마다 새로운 StatementStrategy 로컬 클래스를 만들어야 하는 단점이 있습니다.


### 2-4. 적용 (3)
전략 패턴의 기본 구조에 익명 내부 클래스를 활용한 방식을 템플릿 콜백 패턴이라 합니다.   
전략 패턴의 컨텍스트를 템플릿, 익명 내부 클래스로 만들어지는 오브젝트를 콜백이라 합니다.   
콜백 특정 로직을 담은 메소드를 실행 시키기 위해 사용할 것 이고 이 것을 펑셔널 오브젝트 라고 합니다.   
템플릿-콜백 방식은 전략 패턴과 DI 의 장점을 익명 내부 클래스 사용 전략과 결합한 방법 입니다.   

2-3. 적용 (2) 의 java 코드에서 로컬 클래스를 펑셔널 오브젝트로 수정한 것이고 그 외 부분은 동일합니다.
```java
...

public class UserDao {
  ...
  private JdbcContext jdbcContext;

  public void setDataSource(DataSource dataSource) {
    this.jdbcContext = new JdbcContext();
    this.jdbcContext.setDatasource(dataSource);
  }

  public void deleteAll() throws SQLException {
    this.jdbcContext.workWithStatementStrategy(new StatementStrategy {
      public PreparedStatement(Connection c) throws SQLException {
        return c.preparedStatement("delete from users");
      }
    });
  }

  public void deleteUser(String userId) throws SQLException {
    this.jdbcContext.workWithStatementStrategy(new StatementStrategy {
      public PreparedStatement(Connection c) throws SQLException {
        return c.preparedStatement("delete from users where userid=" + userId);
      }
    });
  }

  public void insertUser(User user) throws SQLException {
    this.jdbcContext.workWithStatementStrategy(new StatementStrategy {
      public PreparedStatement(Connection c) throws SQLException {
        return c.preparedStatement(
          "insert into users values (" 
          + user.userId + ", "
          + user.userName + ", "
          + user.age + ")"
        );
      }
    });
  }
  ...
}
```

## 3. 템플릿 메소드 패턴 활용 사례 - 스프링 JDBCTemplate
스프링은 JDBC 를 이용하는 DAO 에서 사용할 수 있도록 준비된 다양한 템플릿과 콜백을 제공합니다.   
스프링이 제공하는 JDBC 코드용 기본 템플릿은 JdbcTempalte 입니다.    

앞서 만든 StatementStrategy 인터페이스의 makePreparedStatement() 에 대응하는   
JdbcTemplate 의 메소드는 PreaparedStatementCreator 인터페이스의    
createPreapredStatement() 메소드 입니다.    

그리고 SQL 문장만 전달하면 미리 준비된 콜백을 만들어서 템플릿을 호출하는 것까지   
한 번에 해주는 편리한 메소드도 제공합니다.   

```java 
public class UserDao {
  ...
  private JdbcTemplate jdbcTemplate;

  public void setDataSource(DataSource dataSource) {
    this.jdbcTemplate = new JdbcTemplate(dataSource);
    this.dataSource = dataSource;
  }

  public void deleteAll() {
    this.jdbcTempalte.update(
      new PreparedStatementCreator() {
        public PreparedStatement createPreparedStatemnt(Connection conn) throws SQLException {
          return conn.preparedStatement("delete from users");
        }
      }
    )
  }

  public void deleteAllSimple() {
    this.jdbcTemplate.update("delete from users");
  }
}
```

그 외에도 PreparedStatement 의 쿼리를 실행해서 ResultSet 을 전달받는    
queryForInt(), queryForObject() 등 의 함수를 제공합니다.   

스프링에서 제공하는 JDBC 모듈 역시 템플릿 콜백 패턴을 활용해 구현된 것을 볼 수 있습니다.
