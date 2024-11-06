---
layout: post
title: Java 애노테이션
date: 2024-11-06 16:00:00 + 0900
categories: Java
ref: annotation
---

### 강의 : [김영한의 실전 자바 - 고급 2편, I/O, 네트워크, 리플렉션](https://www.inflearn.com/course/%EA%B9%80%EC%98%81%ED%95%9C%EC%9D%98-%EC%8B%A4%EC%A0%84-%EC%9E%90%EB%B0%94-%EA%B3%A0%EA%B8%89-2/dashboard)

# 10. Java 애노테이션

ReflectionServlet은 요청 URL과 메서드 이름이 같다면 해당 메서드를 동적으로 호출할 수 있다.    
하지만 URL과 메서드 이름이 다르면 호출할 수 없다. 이 문제는 애노테이션을 활용해 해결할 수 있다.   
<br/>
Controller에 추가 정보를 주석으로 적어두고 사용할 수 있다면 URL과 비교해 메서드를 호출하는데 사용할 수 있다.   
주석은 컴파일 시점에 모두 제거된다. 프로그램 실행 중에 읽어서 사용할 수 있는 주석이 애노테이션이다.    

## 10-1. 애노테이션 예제

애노테이션은 @interface 키워드를 사용해 만든다.    
애노테이션은 기본 타입(int, float, boolean 등), String, Class(메타데이터) 또는 인터페이스, 앞선 타입들의 배열 외에는 정의할 수 없다. 특히 일반적인 클래스를 사용할 수 없다.    
그리고 예외를 사용할 수 없으며 void를 반환 타입으로 사용할 수 없다.    
요소 이름은 메서드 형태로 정의되며, 괄호()를 보함하되 매개변수는 없어야 한다.   

```java
@Retention(RetentionPolicy.RUNTIME)
public @interface AnnoElement {
    String value();
    int count() default 0;
    String[] tags() default {};

    // MyLogger data(); // 다른 타입은 적용 X
    // 클래스 정보는 가능
    Class<? extends MyLogger> annoData() default MyLogger.class;
}

@AnnoElement(value = "data", count = 10, tags = {"t1", "t2"})
public class ElementData1 {
}

public class ElementData1Main {

    public static void main(String[] args) {
        Class<ElementData1> annoClass = ElementData1.class;
        AnnoElement annotation = annoClass.getAnnotation(AnnoElement.class);

        String value = annotation.value();
        System.out.println("value = " + value);

        int count = annotation.count();
        System.out.println("count = " + count);

        String[] tags = annotation.tags();
        System.out.println("tags = " + Arrays.toString(tags));
    }
}
```

```
실행 결과

value = data
count = 10
```

## 10-2. 메타 애노테이션

메타 애노테이션은 애노테이션을 정의하는데 사용하는 특별한 애노테이션이다.   

#### @Retention

애노테이션의 생존 기간을 지정한다.
- RetentinPolicy.SOURCE: 소스 코드에만 남아있다. 컴파일 시점에 제거된다.
- RetentionPolicy.CLASS: 컴파일 후 class 파일까지는 남아 있지만 자바 실행 시점에 제거된다.(기본 값)
- RetentionPolicy.RUNTIME: 자바 실행 중에도 남아있다. 대부분 이 설정을 사용한다.

#### @Target

애노테이션을 적용할 수있는 위치를 지정한다.   
주로 TYPE, FIELD, METHOD를 사용한다.   

```java
public enum ElementType {
    TYPE,
    FIELD,
    METHOD,
    PARAMETER,
    CONSTRUCTOR,
    LOCAL_VARIABLE,
    ANNOTATION_TYPE,
    PACKAGE,
    TYPE_PARAMETER,
    TYPE_USE,
    MODULE,
    RECORD_COMPONENT;
}
```

#### @Documented

자바 API 문서를 만들 때 해당 애노테이션이 함께 포함되는지 지정한다. 보통 함께 사용한다.      

```java

@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD, ElementType.TYPE})
@Documented
public @interface AnnoMeta {
}

public class MetaData {
    //@AnnoMeta // 필드에 적용 - 컴파일 오류
    private String id; 
    
    @AnnoMeta // 메서드에 적용
    public void call() {}
    
    public static void main(String[] args) throws NoSuchMethodException {
        AnnoMeta typeAnno = MetaData.class.getAnnotation(AnnoMeta.class);
        System.out.println("typeAnno = " + typeAnno);
        
        AnnoMeta methodAnno = MetaData.class.getMethod("call").getAnnotation(AnnoMeta.class);
        System.out.println("methodAnno = " + methodAnno);
    }
}
```

```
실행 결과

typeAnno = @annotation.basic.AnnoMeta()
methodAnno = @annotation.basic.AnnoMeta()
```

#### @Inherited

애노테이션을 정의할 때 @Inherited 메타 애노테이션을 붙이면, 애노테이션을 적용한 클래스의 자식도 해당 애노테이션을 부여 받을 수 있다.   
단, 이 기능은 클래스에서만 작동하고, 인터페이스의 구현체에는 적용되지 않는다.   

```java
@Inherited
@Retention(RetentionPolicy.RUNTIME)
public @interface InheritedAnnotation {
}

@Retention(RetentionPolicy.RUNTIME)
public @interface NoInheritedAnnotation {
}

@InheritedAnnotation
@NoInheritedAnnotation
public class Parent {
}

public class Child extends Parent {
}

@InheritedAnnotation
@NoInheritedAnnotation
public interface TestInterface {
}

public class TestInterfaceImpl implements TestInterface {
}

public class InheritedMain {

    public static void main(String[] args) {
        print(Parent.class);
        print(Child.class);
        print(TestInterface.class);
        print(TestInterfaceImpl.class);
    }

    private static void print(Class<?> clazz) {
        System.out.println("class: " + clazz);
        for (Annotation annotation : clazz.getAnnotations()) {
            System.out.println(" - " + annotation.annotationType());
        }
        System.out.println();
    }
}
```

```
실행 결과

class: class annotation.basic.inherited.Parent
    - InheritedAnnotation
    - NoInheritedAnnotation
class: class annotation.basic.inherited.Child
    - InheritedAnnotation
class: interface annotation.basic.inherited.TestInterface
    - NoInheritedAnnotation
    - InheritedAnnotation
class: class annotation.basic.inherited.TestInterfaceImpl
```

## 10-3. 애노테이션 기반 검증기

#### @NotEmpty - 빈 값을 검증하는데 사용

```java
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface NotEmpty {
    String message() default "값이 비어있습니다.";
}
```

#### @Range - 숫자의 범위를 검증하는데 사용

```java
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Range {
    int min();
    int max();
    String message() default "범위를 넘었습니다."
}
```

#### User 클래스에 검증용 애노테이션 추가

```java
public class User {

    @NotEmpty
    private String name;

    @Range(min = 1, max = 100, message = "나이는 1과 100 사이여야 합니다.")
    private int age;

    public User(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public String getName() {
        return name;
    }

    public int getAge() {
        return age;
    }
}
```

#### Team 클래스에 검증용 애노테이션 추가

```java
public class Team {

    @NotEmpty(message = "이름이 비어있습니다.")
    private String name;

    @Range(min = 1, max = 999, message = "회원 수는 1과 999 사이여야 합니다.")
    private int memberCount;

    public Team(String name, int memberCount) {
        this.name = name;
        this.memberCount = memberCount;
    }

    public String getName() {
        return name;
    }

    public int getMemberCount() {
        return memberCount;
    }
}
```

#### 검증기 개발

```java
public class Validator {

    public static void validate(Object obj) throws Exception {
        Fields[] fields = obj.getClass().getDeclaredFields();

        for (Field field : fields) {
            field.setAccessible(true);
            if (field.isAnnotationPresent(NotEmpty.class)) {
                String value = (String) field.get(obj);
                NotEmpty annotation = field.getAnnotation(NotEmpty.class);
                if (value == null || value.isEmpty()) throw new RuntimeException(annotation.message());
            }

            if (field.isAnnotationPresent(Range.class)) {
                long value = field.getLong(obj);
                Range annotation = field.getAnnotation(Range.class);
                if (value < annotation.min() || value > annotation.max()) throw new RuntimeException(annotation.message());
            }
        }
    }
}
```

```java
public class ValidatorV2Main {

    public static void main(String[] args) {
        User user = new User("user1", 0);
        Team team = new Team("", 0);

        try {
            log("== user 검증 ==");
            Validator.validate(user);
        } catch (Exception e) {
            log(e);
        }

        try {
            log("== team 검증 ==");
            Validator.validate(team);
        } catch (Exception e) {
            log(e);
        }
    }
}
```

```
실행 결과

17:16:39.166 [     main] == user 검증 ==
17:16:39.187 [     main] java.lang.RuntimeException: 나이는 1과 100 사이여야 합니다.
17:16:39.187 [     main] == team 검증 ==
17:16:39.187 [     main] java.lang.RuntimeException: 이름이 비어있습니다.
```

## 10-4. 정리

스프링이나 JPA는 리플렉션과 애노테이션을 활용한 복잡한 메타프로그래밍으로 의존성 주입, ORM, AOP, 설정의 자동화, 트랜잭션 관리와 같은 기능들을 제공한다.   
- 의존성 주입: 스프링은 @autowired 애노테이션만 붙이면 객체의 필드나 생성자에 자동으로 의존성을 주입한다.
- ORM: JPA는 @Entity, @Table, @Column 등의 애노테이션으로 객체-테이블 관계를 설정한다.
- AOP: 스프링은 @Aspect, @Before, @After 등의 애노테이션으로 런타임에 코드를 동적으로 주입해 관점 지향 프로그래밍을 구현한다. 
- 설정의 자동화: @Configuration, @Bean 등의 애노테이션을 사용해 다양한 설정을 편리하게 적용한다.
- 트랜잭션 관리: @Transactional 애노테이션 만으로 메서드 레벌의 DB 트랜잭션 처리가 가능해진다.
<br/>
이러한 기능들은 개발자가 비즈니스 로직에 집중할 수 있게 해준다.   
스프링이나 JPA 같은 프레임워크들은 리플렉션과 애노테이션을 극대화해서 사용한다.   
따라서 리플렉션과 애노테이션에 대한 이해를 바탕으로 프레임워크의 동작 원리를 더 깊이 파악하고 효과적으로 활용할 수 있다.   
