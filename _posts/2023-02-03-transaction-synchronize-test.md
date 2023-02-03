---
layout: post
title: 데이터베이스 트랜잭션 경계와 동기화 테스트
date: 2023-02-03 19:00:00 + 0900
categories: DB
ref: DB, transaction, transaction manager
---

# 데이터베이스 트랜잭션 경계와 동기화 테스트

이전 [트랜잭션 경계와 동기화](https://5-sh.github.io/db/2023/02/03/transaction-synchronize.html) 에서 알아본 내용을 실제로 테스트 해 보겠습니다.    
전체 코드는 [이 링크](https://github.com/5-SH/jdbcTemplate-tx-sync-demo) 를 참고해 주세요.

## 1. 테스트 구성
JDBC 와 MySql 을 사용해 테스트 했습니다.   
name 과 seq 컬ㄹ머을 가진 간단한 테이블에 여러 사용자를 같은 트랜잭션에서 추가하고 추가하는 도중 예외 발생 시 모든 사용자 추가 요청이 롤백 되는지 확인 했습니다.   
트랜잭션 경계는 UserService 에서 설정하고 데이터 액세스는 UserDao 에서 JDBC 를 통해 수행합니다.   
각 테스트가 끝난 다음 테이블에 추가된 row 들을 지웁니다.   

## 2. 서비스, DAO 코드
테스트에 사용되는 UserService, UserDao 코드는 아래와 같습니다.   

```java
public class UserDao {

  @Autowired
  JdbcTemplate jdbcTemplate;

  void addUser(String name) {
    int seq = jdbcTemplate.queryForObject("select count(*) from test_user", Integer.class) + 1;
    jdbcTemplate.execute("insert into test_user values (" + seq + ", '" + name + "')");
  }

  void addUserWithException(String name) {
    int seq = jdbcTemplate.queryForObject("select count(*) from test_user", Integer.class) + 1;
    jdbcTemplate.execute("insert into test_user values (" + seq + ", '" + name + "')");

    throw new IllegalArgumentException("Query Exception" + name);
  }

  int getUserCount() { return jdbcTemplate.queryForObject("select count(*) from test_user", Integer.class); }

  void deleteAll() { jdbcTemplate.execute("delete from test_user"); }

  void updateUser(int seq, String name) {
    jdbcTemplate.execute("update test_user set name = '" + name + "' where id = " + seq);
  }

  void updateUserWithException(int seq, String name) {
    jdbcTemplate.execute("update test_user set name = '" + name + "' where id = " + seq);

    throw new IllegalArgumentException("Query Exception" + name);
  }

  void deleteUser(int seq) {
    jdbcTemplate.execute("delete from test_user where id = " + seq);
  }
}

@Service
public class UserService {

  @Autowired UserDao userDao;
  private TransactionTemplate transactionTemplate;

  @Autowired
  public void init(PlatformTransactionManager transactionManager) {
    this.transactionTemplate = new TransactionTemplate(transactionManager);
  }

  ...

  public void addUserAllWithException(List<String> nameList) {
    this.transactionTemplate.execute(status -> {
      String exceptionName = nameList.get(nameList.size() - 1);
      for (String name : nameList) {
        if (name.equals(exceptionName)) {
          userDao.addUserWithException(name);
        } else {
          userDao.addUser(name);
        }
      }

      System.out.println("after add user count : " + userDao.getUserCount());

      return null;
    });
  }

  public void addAllAndUpdateUserWithException(List<String> nameList) {
    this.transactionTemplate.execute(status -> {
      for (String name : nameList) {
        userDao.addUser(name);
      }
      int count1 = userDao.getUserCount();
      System.out.println("after add user all count : " + count1);

      userDao.deleteUser(3);

      int count2 = userDao.getUserCount();
      System.out.println("after delete user count : " + count2);

      userDao.updateUserWithException(2, "update2");

      return null;
    });
  }

  ...
}

@Configuration
public class DataAccessConfig {

  @Bean
  UserDao userDao() { return new UserDao(); }

  @Bean(name="transactionManager")
  PlatformTransactionManager transactionManager(DataSource dataSource) {
    return new DataSourceTransactionManager(dataSource);
  }
}
```

## 2. 사용자 추가 테스트
트랜잭션 경계 내에서 4명의 사용자를 추가하고 트랜잭션 경계 없이 4명의 사용자를 추가하는 테스트를 수행합니다.   
4번 째 사용자를 추가할 때 UserDao 의 메소드에서 롤백을 위해 IllegalArgumentException 런타임 예외를 발생 시킵니다.   

```java
@SpringBootTest
class JdbctemplatedemoApplicationTests {

	@Autowired UserDao userDao;

	@Autowired UserService userService;

	@BeforeEach
	public void afterEach() {
		userDao.deleteAll();
	} 

  ...
  @Test
	void addAllOrNothing() {
		try {
			userService.addUserAllWithException(Arrays.asList("test1", "test2", "test3", "test4"));
			Assertions.assertThat(userDao.getUserCount()).isEqualTo(0);
		} catch (IllegalArgumentException e) {
			Assertions.assertThat(userDao.getUserCount()).isEqualTo(0);
		}
	}

	@Test
	void addAllOrNothingWithoutTransaction() {
		try {
			userService.addUserAllWithExceptionNotAppliedTx(Arrays.asList("test1", "test2", "test3", "test4"));
			Assertions.assertThat(userDao.getUserCount()).isEqualTo(4);
		} catch (IllegalArgumentException e) {
			Assertions.assertThat(userDao.getUserCount()).isEqualTo(4);
		}
	}
  ...
}
```

테스트를 수행한 결과는 아래와 같습니다.   

![test1](https://user-images.githubusercontent.com/13375810/217811825-9e51dca6-1c9c-4b64-8607-92be10b1401e.png)   

UserService 에 트랜잭션 경계를 설정하지 않은 addAllOrNothing 테스트는 마지막 사용자 추가 후 발생한 런타임 에러로 인해 트랜잭션 경계 내 모든 사용자 추가 요청이 롤백되어 테스트 테이블의 row 개수가 0 인 것을 확인할 수 있습니다.   

![test2](https://user-images.githubusercontent.com/13375810/217812104-0e3e8892-c7ae-49b4-8538-ce3903b6af89.png)   

UserService 에 트랜잭션 경계를 설정하지 않은 addAllOrNothingWithoutTransaction 테스트는 마지막 사용자 추가 후 런타임 에러가 발생 했지만 롤백이 되지 않아 4명의 사용자 모두 추가된 것을 확인할 수 있습니다.   

콘솔 출력을 보면 아래와 같이 트랜잭션 경계 내 사용자 추가 쿼리가 커밋이 되지 않았는데 테이블의 row 가 조회되는 것을 확인 할 수 있습니다.   

```
after add user count : 1
after add user count : 2
after add user count : 3
```

커밋되지 않은 row 가 보인 이유는 같은 커넥션에서 조회했기 때문 입니다.   
MySql 은 트랜잭션의 격리 수준이 기본적으로 REPEATABLE READ 입니다. REPEATABLE READ 는 트랜잭션의 버전을 확인해 언두 영역에 커밋되기 전의 데이터를 보여줍니다.   
사용자를 추가한 트랜잭션과 사용자의 수를 조회하는 트랜잭션이 같은 버전이기 때문에 커밋되지 않은 사용자가 조회되는 것 입니다.   
사용자 추가 요청이 커밋되지 않은 상태에서 다른 커넥션을 통해 사용자 수를 조회하면 0 건이 조회됩니다.   
자세한 내용은 [트랜잭션 격리 수준](https://5-sh.github.io/db/2022/08/06/DB-transaction-isolation-level.html) 문서를 참고해 주세요.    

## 3. 사용자 추가, 수정, 삭제 테스트
트랜잭션 경계 내에서 4명의 사용자를 추가 후 수정, 삭제하는 테스트를 수행하고 트랜잭션 경계없이 같은 테스트를 수행합니다.    
4번 째 사용자를 추가할 때 UserDao 의 메소드에서 롤백을 위해 IllegalArgumentException 런타임 예외를 발생 시킵니다.   

![test3](https://user-images.githubusercontent.com/13375810/217813665-235cbe2b-8f6d-479e-8ef5-7b19bc94c77b.png)   

![test4](https://user-images.githubusercontent.com/13375810/217813710-6aedf9c2-fcd9-4d3a-817d-dd8aa9a82fda.png)

사용자 추가 테스트와 마찬가지로 트랜잭션 경계를 설정하고 수행한 쿼리는 모두 롤백 되었지만 트랜잭션 경계를 설정하지 않고 수행한 쿼리는 롤백되지 않은 것을 확인 할 수 있습니다.   
