---
layout: post
title: JTA 를 활용한 분산 트랜잭션 관리 테스트
date: 2023-02-05 22:00:00 + 0900
categories: [db]
tags: [db, transaction, transaction manager, jta]
---

__RoutingDataSource 를 사용한 분산 데이터베이스 환경에서 JTA 를 이용한 트랜잭션 처리__ 네이버 D2 문서를 읽고 필요한 내용을 추가하고 정리한 문서입니다.    

전체 테스트 코드는 [이 링크](https://github.com/5-SH/jta-demo) 를 확인해 주세요.   

## 1. 테스트 환경
1) Java 1.8   
2) 데이터베이스 구성    
![db](https://user-images.githubusercontent.com/13375810/217977134-b7c4d574-b1ba-4a5b-8f4e-2e274bc191dc.png)
3) 주요 Maven 의존성
    - spring-boot-starter-aop:2.0.3.RELEASE
    - spring-boot-starter-jta-atomikos:2.0.3.RELEASE
    - mybatis-spring-boot-starter:1.3.2
    - com.microsoft.sqlserver
    - com.oracle.database.jdbc:21.1.0.0
    - mysql
    - org.postgresql
    - org.mariadb.jdbc

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
	<modelVersion>4.0.0</modelVersion>
	<parent>
		<groupId>org.springframework.boot</groupId>
		<artifactId>spring-boot-starter-parent</artifactId>
		<version>2.0.3.RELEASE</version>
		<relativePath/> <!-- lookup parent from repository -->
	</parent>
	<groupId>com.seungho</groupId>
	<artifactId>jtademo</artifactId>
	<version>0.0.1-SNAPSHOT</version>
	<name>jtademo</name>
	<description>Demo project for Spring Boot</description>
	<properties>
		<java.version>1.8</java.version>
	</properties>
	<dependencies>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-web</artifactId>
		</dependency>

		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-test</artifactId>
			<scope>test</scope>
		</dependency>

		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-aop</artifactId>
			<version>2.0.3.RELEASE</version>
		</dependency>

		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-jta-atomikos</artifactId>
			<version>2.0.3.RELEASE</version>
		</dependency>

		<dependency>
			<groupId>org.mybatis.spring.boot</groupId>
			<artifactId>mybatis-spring-boot-starter</artifactId>
			<version>1.3.2</version>
		</dependency>

		<dependency>
			<groupId>com.microsoft.sqlserver</groupId>
			<artifactId>mssql-jdbc</artifactId>
		</dependency>

		<dependency>
			<groupId>com.oracle.database.jdbc</groupId>
			<artifactId>ojdbc8</artifactId>
			<version>21.1.0.0</version>
		</dependency>

		<dependency>
			<groupId>mysql</groupId>
			<artifactId>mysql-connector-java</artifactId>
		</dependency>

		<dependency>
			<groupId>org.postgresql</groupId>
			<artifactId>postgresql</artifactId>
		</dependency>

		<dependency>
			<groupId>org.mariadb.jdbc</groupId>
			<artifactId>mariadb-java-client</artifactId>
		</dependency>

		<dependency>
			<groupId>org.projectlombok</groupId>
			<artifactId>lombok</artifactId>
			<optional>true</optional>
		</dependency>
	</dependencies>

	<build>
		<plugins>
			<plugin>
				<groupId>org.springframework.boot</groupId>
				<artifactId>spring-boot-maven-plugin</artifactId>
			</plugin>
		</plugins>
	</build>

</project>
```

## 2. 테스트 구성
1) 코드 구성   
RoutingDataSource 를 통해 MySql, MariaDB, Postgresql 데이터소스를 관리합니다.
MyBatis Mapper 를 실행하기 전 AOP 를 통해 사용할 데이터소스를 선택해 ContextHolder 에 저장합니다.   
DBMS 작업은 MyBatis 를 통해 수행하고 트랜잭션 동기화는 JtaTransactionManager 구현체로 atomikos 를 사용합니다.   
트랜잭션 경계는 FooService 에서 @Transactional 어노테이션으로 설정합니다.    

2) 비즈니스 로직 요구사항    
  - FooService.bar 에 사용자 추가 요청이 들어오면 commonDB 의 common_test 테이블에 사용자를 추가하고 userId 에 따라 Postgresql, MariaDB 중 하나로 라우팅 되어 user_test 테이블에 사용자를 추가합니다.   
  - FooService.bar 메서드에서 userMapper.insert, commonMapper.insert 를 순서대로 호출해 각각 user_test, common_test 테이블에 사용자를 추가합니다.   
  - FooService.barWithException 메서드는 userMapper.insert, commonMapper.insert 를 순서대로 호출하고 IllegalArgumentExcetpion 런타임 예외를 의도적으로 발생 시킵니다.   
  - userMapper.insert, commonMapper.insert 중 하나라도 실패하는 경우 모두 롤백 되어야 합니다.   

## 3. 테스트 과정 
1. bar 에서 userMapper.insert 메소드가 수행되면 AOP 가 실행되어 RoutingMapperAspect.aroundTargetMethod 메소드가 실행됩니다.   
    - UserMapper 는 @RoutingMapper 어노테이션이 있기 때문에 aroundTargetMethod 메소드에서 userId 를 통해 routingKey 를 만듭니다.   
2. JtaTransactionManager 의 doGetTransaction 메서드 내부에서 UserDB 의 XA 데이터소스에서 커넥션을 가져와 트랜잭션 객체를 생성합니다.   
    - 커넥션을 만드는데 데이터소스는 RoutingDataSource 에 있는 UserDB 를 사용합니다.   
3. userMapper 는 트랜잭션 객체를 넘겨 받아 트랜잭션을 시작합니다.   
    - 트랜잭션 동기화를 위해 TransactionSynchronizationManager 가 내부 ThreadLocal 에 커넥션을 저장합니다.   
4. userMapper 가 실행되어 MyBatis 의 SQLSession 의 insert 구문이 UserDB 에 수행됩니다.   
5. 다음 bar 메소드에서 commonMapper.insert 메소드가 수행되면 AOP 가 실행되어 RoutingMapperAspect.aroundTargetMethod 메소드가 실행됩니다.   
    - CommonMapper 는 @RoutingMapper 어노테이션이 없기 때문에 DataSourceConfig 에서 디폴트로 설정한 CommonDB 로 RoutingDataSource 에 설정됩니다.
6. JtaTransactionManager 의 doGetTransaction 메서드 내부에서 CommonDB 의 XA 데이터소스에서 커넥션을 가져와 트랜잭션 객체를 생성합니다.   
7. commonMapper 는 트랜잭션 객체를 넘겨 받아 트랜잭션을 시작합니다.   
8. commonMapper 가 실행되어 MyBatis 의 SQLSession 의 insert 구문이 CommonDB 에 수행됩니다.   
9. 다음 bar 메소드에서 IllegalArgumentException 런타임 에러를 발생해 롤백을 수행하게 됩니다.   
10. JtaTransactionManager 에서 UserDB XA 데이터소스와 CommonDB XA 데이터소스에서 만든 분산 트랜잭션들을 관리해 userMapper.insert 와 commonMapper.insert 작업을 롤백합니다.   
11. UserDB 의 user_test 테이블과 CommonDB 의 common_test 테이블을 조회하면 사용자가 추가되지 않고 롤백된 것을 확인할 수 있습니다.   

## 4. 주요 소스 코드

```java
// DataSourceConfig.java
@Configuration
public class DataSourceConfig {

  @Bean
  public DataSource routingDataSource() {
    AbstractRoutingDataSource routingDataSource = new RoutingDatasource();
    routingDataSource.setDefaultTargetDataSource(createMySqlDataSource("jdbc:mysql://localhost:3306/spring"));

    Map<Object, Object> targetDataSources = new HashMap<>();
    targetDataSources.put(0, createPostgresqlDataSource("jdbc:postgresql://localhost:5433/postgres"));
    targetDataSources.put(1, createMariaDataSource("jdbc:mariadb://localhost:3305/maria"));
//    targetDataSources.put(2, createOracleDataSource("jdbc:oracle:thin:@localhost:1521/xe"));
//    targetDataSources.put(3, createSqlServerDataSource("jdbc:sqlserver://localhost:1433;DatabaseName=mssql"));

    routingDataSource.setTargetDataSources(targetDataSources);

    return routingDataSource;
  }

  private DataSource createMySqlDataSource(String url) {
    AtomikosDataSourceBean dataSource = new AtomikosDataSourceBean();

    Properties properties = new Properties();
    properties.setProperty("user", "root");
    properties.setProperty("password", "root");
    properties.setProperty("url", url);

    dataSource.setXaDataSourceClassName("com.mysql.jdbc.jdbc2.optional.MysqlXADataSource");
    dataSource.setUniqueResourceName(url.substring(0, url.length() > 45 ? 44 : url.length()));
    dataSource.setXaProperties(properties);

    return dataSource;
  }

  private DataSource createMariaDataSource(String url) {
    AtomikosDataSourceBean dataSource = new AtomikosDataSourceBean();

    Properties properties = new Properties();
    properties.setProperty("user", "root");
    properties.setProperty("password", "root");
    properties.setProperty("url", url);

    dataSource.setXaDataSourceClassName("org.mariadb.jdbc.MariaDbDataSource");
    dataSource.setUniqueResourceName(url.substring(0, url.length() > 45 ? 44 : url.length()));
    dataSource.setXaProperties(properties);

    return dataSource;
  }

  private DataSource createPostgresqlDataSource(String url) {
    AtomikosDataSourceBean dataSource = new AtomikosDataSourceBean();

    Properties properties = new Properties();
    properties.setProperty("user", "postgres");
    properties.setProperty("password", "root");
    properties.setProperty("url", url);

    dataSource.setXaDataSourceClassName("org.postgresql.xa.PGXADataSource");
    dataSource.setUniqueResourceName(url.substring(0, url.length() > 45 ? 44 : url.length()));
    dataSource.setXaProperties(properties);

    return dataSource;
  }

  private DataSource createOracleDataSource(String url) {
    AtomikosDataSourceBean dataSource = new AtomikosDataSourceBean();

    Properties properties = new Properties();
    properties.setProperty("user", "root");
    properties.setProperty("password", "root");
    properties.setProperty("URL", url);

    dataSource.setXaDataSourceClassName("oracle.jdbc.xa.client.OracleXADataSource");
    dataSource.setUniqueResourceName(url.substring(0, url.length() > 45 ? 44 : url.length()));
    dataSource.setXaProperties(properties);

    return dataSource;
  }

  private DataSource createSqlServerDataSource(String url) {
    AtomikosDataSourceBean dataSource = new AtomikosDataSourceBean();

    Properties properties = new Properties();
    properties.setProperty("user", "root");
    properties.setProperty("password", "root");
    properties.setProperty("URL", url);

    dataSource.setXaDataSourceClassName("com.microsoft.sqlserver.jdbc.SQLServerXADataSource");
    dataSource.setUniqueResourceName(url.substring(0, url.length() > 45 ? 44 : url.length()));
    dataSource.setXaProperties(properties);

    return dataSource;
  }

  @Bean
  public SqlSessionFactory sqlSessionFactory(DataSource dataSource) throws Exception {
    SqlSessionFactoryBean factory = new SqlSessionFactoryBean();
    factory.setDataSource(dataSource);
    factory.setTransactionFactory(new ManagedTransactionFactory());
    return factory.getObject();
  }
}

// RoutingMapperAspect.java
@Slf4j
@Aspect
@Configuration
public class RoutingMapperAspect {

  @Around("execution(* com.seungho..repository..*Mapper.*(..))")
  public Object aroundTargetMethod(ProceedingJoinPoint thisJoinPoint) {
    MethodSignature methodSignature = (MethodSignature) thisJoinPoint.getSignature();
    Class<?> mapperInterface = methodSignature.getDeclaringType();
    Method method = methodSignature.getMethod();
    Parameter[] parameters = method.getParameters();
    Object[] args = thisJoinPoint.getArgs();

    RoutingMapper routingMapper = mapperInterface.getDeclaredAnnotation(RoutingMapper.class);

    if (routingMapper != null) {
      String userId = findRoutingKey(parameters, args);
      Integer index = determineRoutingDataSourceIndex(userId);
      log.debug("index: {}", index);
      ContextHolder.set(index);
    }

    try {
      return thisJoinPoint.proceed();
    } catch (Throwable throwable) {
      throw new RuntimeException(throwable);
    } finally {
      ContextHolder.clear();
    }
  }

  private String findRoutingKey(Parameter[] parameters, Object[] args) {
    for (int i = 0; i < parameters.length; i++) {
      RoutingKey routingKey = parameters[i].getDeclaredAnnotation(RoutingKey.class);
      if (routingKey != null) {
        return String.valueOf(args[i]);
      }
    }
    throw new RuntimeException("can't find RoutingKey");
  }

  private Integer determineRoutingDataSourceIndex(String userId) {
    return Math.abs(userId.hashCode()) % 2;
  }
}

// FooService.java
@Service
public class FooService {

  @Autowired private UserMapper userMapper;

  @Autowired private CommonMapper commonMapper;

  @Transactional
  public void bar(String userId) {
    userMapper.insert(userId);
    commonMapper.insert(userId);
  }

  @Transactional
  public void barWithException(String userId) {
    userMapper.insert(userId);
    commonMapper.insert(userId);

    if ("test5".equals(userId)) {
      throw new IllegalArgumentException("Intended exception");
    }
  }

  @Transactional
  public void deleteAll(String userId) {
    userMapper.deleteAll(userId);
    commonMapper.deleteAll(userId);
  }

  public int getUserCount(String userId) { return userMapper.getCount(userId); }

  public int getCommonCount(String userId) { return commonMapper.getCount(userId); }
}

// UserMapper.java
@RoutingMapper
@Mapper
public interface UserMapper {

  @Insert("insert into user_test(user_id) values(#{userId})")
  void insert(@RoutingKey @Param("userId") String userId);

  @Select("select count(*) from user_test where user_id=#{userId}")
  int getCount(@RoutingKey @Param("userId") String userId);

  @Delete("delete from user_test")
  void deleteAll(@RoutingKey @Param("userId") String userId);
}

// CommonMapper.java
@Mapper
public interface CommonMapper {

  @Insert("insert into common_test(user_id) values(#{userId})")
  void insert(@Param("userId") String userId);

  @Select("select count(*) from common_test where user_Id=#{userId}")
  int getCount(@Param("userId") String userId);

  @Delete("delete from common_test")
  void deleteAll(@Param("userId") String userId);
}

// JtademoApplicationTests.java
@Slf4j
@RunWith(SpringRunner.class)
@SpringBootTest
public class JtademoApplicationTests {

	@Autowired private FooService fooService;

	@Test
	public void addAll() {
		log.debug("addAll test: {}", "=======================================================");
		String userId = "test5";
		fooService.deleteAll(userId);
		fooService.bar(userId);

		Assertions.assertThat(fooService.getUserCount(userId)).isEqualTo(1);
		Assertions.assertThat(fooService.getCommonCount(userId)).isEqualTo(1);
	}

	@Test
	public void addAllWithException() {

			String userId = "test5";
		try {
			log.debug("addAllWithException test: {}", "=======================================================");
			fooService.deleteAll(userId);
			fooService.barWithException(userId);

			Assertions.assertThat(fooService.getUserCount(userId)).isEqualTo(0);
			Assertions.assertThat(fooService.getCommonCount(userId)).isEqualTo(0);
		} catch (IllegalArgumentException e) {
			Assertions.assertThat(fooService.getUserCount(userId)).isEqualTo(0);
			Assertions.assertThat(fooService.getCommonCount(userId)).isEqualTo(0);
		}
	}

}
```

## 5. 테스트 결과
UserMapper.insert, CommonMapper.insert 를 실행한 다음 의도적으로 런타임 에러를 발생시켜 롤백이 되는지 확인하는 테스트 입니다.   
테스트에 사용한 "test5" userId 값은 UserDB 로 Maria 를 선택합니다. (다른 userId 값을 사용하면 다른 DB 를 선택하게 됩니다.)   
정상적으로 롤백이 된다면 CommonDB 인 MySQL 과 UserDB 인 Maria 에 사용자가 추가되지 않아야 합니다.    
테스트 결과로 사용자가 추가되지 않은 것을 확인할 수 있습니다.   

![testresult1](https://user-images.githubusercontent.com/13375810/217980721-2442f464-4af5-4e7d-a4f4-747db792d097.png)   

![testresult2](https://user-images.githubusercontent.com/13375810/217980804-95d3dfe5-69a9-4f04-91ec-bdadf75e4471.png)
