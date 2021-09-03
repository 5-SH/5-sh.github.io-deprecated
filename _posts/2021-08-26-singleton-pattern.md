---
layout: post
title: 싱글톤 패턴 구현 방법 4가지
date: 2021-08-26 19:30:00 + 0900
categories: Patterns
ref: java, singleton pattern
---

# 싱글톤 패턴 구현 방법 4가지

## 1. static 을 활용한 방법

```java
class BasicSingleton implements Serializable {
  private BasicSingleton() {}
  private static final BasicSingleton INSTANCE = new BasicSingleton();
  public static BasicSingleton getInstance() {
    return INSTANCE;
  }

  /**
   * readResolve method 는 readObject 메소드에서 생성한 인스턴스를 다른 인스턴스로 바꿔준다. 만일 역직렬화 되는 객체의
   * 클래스에서 readResolve 메소드를 다시 정의하면 그 객체가 역직렬화 된 후 그 결과로 새롭게 생성된 객체에 대해 이 메소드가
   * 자동으로 호출되며, 이 메소드에서 반환하는 객체 참조가 역직렬화로 새롭게 생성된 객체 대신 반환된다.
   **/
  protected Object readResolve() {
    return INSTANCE;
  }
}
```

- 가장 기본적인 싱글톤 구현 방법이다.   
- 클래스가 로드 될 때 jvm 에 의해 INSTANCE 가 생성되어 원하는 순간에 싱글톤 인스턴스를 생성하는 lazy loading 은 지원하지 못한다.   
- 싱글톤 객체를 직렬화, 역직렬화를 하면 인스턴스가 두 개 생길 수 있다.
- 리플렉션을 사용해 BasicSingleton 을 생성하면 인스턴스가 두 개 생길 수 있다.
```java
BasicSingleton instance = BasicSingleton.getInstance();
BasicSingleton newInstance;
Constructor[] constructors = BasicSingleton.class.getDeclaredConstructors();
for (Constructor constructor : constructors) {
  constructor.setAccessible(true);
  newInstance = (BasicSingleton) constructor.newInstance();
  break;
}

System.out.println(instance == newInstance); // false
```


## 2. enum 을 활용한 방법

```java
enum EnumBasedSingleton {
  INSTANCE;

  EnumBasedSingleton() {
    value = 42;
  }

  private int value;

  public int getValue() {
    return value;
  }

  public void setValue(int value) {
    this.value = value;
  }
}
```

- java enum 의 내부에 선언된 모든 field 들은 한 번만 생성되고 직렬화,역직렬화 그리고 상속할 수 없는 특징을 이용해 싱글톤 구현
- 리플렉션, 직렬화 역직렬화를 해결할 수 있지만 lazy loading 은 해결할 수 없다.

## 3. lazy initialize, double check locking 싱글톤

```java
public static LazySingleton getInstance() {
  if (instance == null) {
    synchronized (LazySingleton.class) {
      if (instance == null) {
        instance = new LazySingleton();
      }
    }
  }
  return instance;
}
```

- 클래스 로드 시 인스턴스가 생성되지 않고 필요할 때 생성된다.
- double check lock 으로 thread-safe 하기 위해 사용한 synchronized 키워드로 생기는 성능 저하를 해결한다.
- 여러 스레드가 메모리를 공유하는 경우 instance 생성이 완료되기 전에 다른 스레드가 instance 가 저장될 메모리 공간에 접근하는 문제가 드물게 발생할 수 있다.

## 4. InnerStatic 싱글톤

```java
public class InnerStaticSingleton {
  public class InnerStaticSingleton() {}
  private static class Impl {
    private static final InnerStaticSingleton INSTANCE = new InnerStaticSingleton();
  }
  public InnerStaticSingleton getInstance() {
    return Impl.INSTANCE;
  }
}
```

- 클래스 초기화 시 JVM 이 원자적으로 수행하는 특성을 활용해  synchronized 키워드 없이 thread-safe 하게 싱글톤 객체를 만들 수 있다.
- InnerStaticSingleton 클래스에서 Impl 클래스 변수를 가지고 있지 않아 클래스 로드 시에 초기화 되지 않는다.
- getInstance() 메소드 호출 시 Impl 의 초기화를 진행하기 때문에 lazy loading 을 할 수 있다.