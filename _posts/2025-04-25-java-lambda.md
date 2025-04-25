---
layout: post
title: Java - lambda
date: 2025-04-25 21:00:00 + 0900
categories: [java]
tags: [lambda, stream, optional, functional programming]
---

### 강의 : [김영한의 실전 자바 - 고급 3편, 람다, 스트림, 함수형 프로그래밍](https://www.inflearn.com/course/%EA%B9%80%EC%98%81%ED%95%9C%EC%9D%98-%EC%8B%A4%EC%A0%84-%EC%9E%90%EB%B0%94-%EA%B3%A0%EA%B8%89-3/dashboard)

# 1. 람다가 필요한 이유 

아래와 같이 주사위 값을 무작위로 구하고 값을 더하는 동작의 실행 시간 측정하는 코드가 있다.

```java
public class Ex1Main {
    private static void helloDice() {
        long startNs = System.nanoTime();

        int randomValue = new Random().nextInt(6) + 1;
        System.out.println("주사위 = " + randomValue);

        long endNs = System.nanoTime();
        System.out.println("실행 시간: " + (endNs - startNs) + "ns");
    }

    private static void helloSum() {
        long startNs = System.nanoTime();

        for (int i = 0; i < 3; i++) {
            System.out.println("i = " + i);
        }

        long endNs = System.nanoTime();
        System.out.println("실행 시간: " + (endNs - startNs) + "ns");
    }

    public static void main(String[] args) {
        helloSum();
        helloDice();
    }
}
```

위 코드에서 실행 시간 측정은 동일한 동작 이고 주사위 값을 무작위로 추출, 값 더하기는 변하는 동작이다.   
변하는 동작은 외부에서 전달 받도록 해, 재사용성을 높일 수 있다.    
이 과정을 동작 매개변수화라고 하고 자바에서 클래스를 인스턴스로 만들어 전달해 동작 매개변수화 할 수 있다.   
아래 코드는 익명 클래스로 동작 매개변수화를 구현했다.   

```java
public interface Procedure {
    void run();
}

public class Ex1RefMainV2 {
    public static void hello(Procedure procedure) {
        long startNs = System.nanoTime();

        procedure.run();

        long endNs = System.nanoTime();
        System.out.println("실행 시간: " + (endNs - startNs) + "ns");
    }

    public static void main(String[] args) {
        hello(new Procedure() {
            public void run() {
                int randomValue = new Random().nextInt(6) + 1;
                System.out.println("주사위 = " + randomValue);
            }
        });

        hello(new Procedure() {
            @Override
            public void run() {
                for (int i = 0; i < 3; i++) {
                    System.out.println("i = " + i);
                }
            }
        });
    }
}
```

익명 클래스를 사용하면 코드 가독성이 떨어진다.   
불필요하고 중복해 작성되는 부분들을 람다 표현식을 통해 간결하게 바꿀 수 있다.   
아래 코드와 같이 코드 블럭에 동작을 구현하고 람다를 통해 코드 블럭을 인수로 전달할 수 있다.   

```java
public class Ex1RefMainV4 {
    public static void hello(Procedure procedure) {
        long startNs = System.nanoTime();

        procedure.run();

        long endNs = System.nanoTime();
        System.out.println("실행 시간: " + (endNs - startNs) + "ns");
    }

    public static void main(String[] args) {
        hello(() -> {
            int randomValue = new Random().nextInt(6) + 1;
            System.out.println("주사위 = " + randomValue);
        });

        hello(() -> {
            for (int i = 0; i < 3; i++) {
                System.out.println("i = " + i);
            }
        });
    }
}
```

# 2. 람다
람다는 자바 8부터 도입된 함수형 프로그래밍을 지원하기 위한 익명 함수이다.

```
반환타입 메서드명(매개변수) {
    본문
}
```

위와 같은 함수 형식을 아래와 같이 간결하게 표현할 수 있다.

```
(매개변수) -> {본문}
```

```java
// 익명 클래스
Procedure procedure = new Procedure() {
    @Override
    public void run() {
        System.out.println("hello! lambda");
    }
};

// 람다
Procedure procedure = () -> {
    System.out.println("hello! lambda");
};
```

함수형 인터페이스는 하나의 추상 메서드를 가지는 인터페이스이다.   
람다는 클래스와 추상 클래스에는 할당할 수 없고 단일 추상 메서드를 가지는 인터페이스에만 할당할 수 있다.    

<br/>

@FunctionalInterface 애노테이션을 사용해 인터페이스가 단 하나의 추상 메서드만을 포함한다는 것을 보장할 수 있다.   
추상 메서드가 하나가 아니면 컴파일 오류 발생시켜 개발자의 실수를 방지한다.   

<br/>

람다는 익명 함수이므로 시그니처에서 이름은 제외하고, 매개변수, 반환 타입이 함수형 인터페이스에 선언한 메서드와 일치해야 한다.   
'{}'와 'return'을 생략해 단일 표현식으로 만들 수 있다.   
그리고 함수형 인터페이스에 매개변수 타입이 정의되어 있어 람다에서 타입 정보를 생략할 수 있다.   

```java
@FunctionalInterface
public interface MyFunction {
    int apply(int a, int b);
}

// 람다
MyFunction myFunction = (int a, int b) -> {
    return a + b;
};

// 단일 표현식 
MyFunction function1 = (int a, int b) -> a + b;

// 타입 정보 생략략
MyFunction function2 = (a, b) -> a + b
```

람다는 고차 함수이다.    
고차 함수는 함수를 값처럼 다루는 함수이고 일급 함수가 가능해야 구현할 수 있다.    
일급 함수는 함수를 변수에 대입할 수 있고, 메서드 매개변수에 전달할 수 있고, 메서드에서 반환할 수 있는 함수이다.    

```java
// 변수에 담은 후 전달
MyFunction add = (a, b) -> a + b;
calculate(add);

// 직접 전달
calculate((a, b) -> a + b);

// 함수(람다)를 매개변수로 받음
static void calculate(MyFunction function) {
    // ...
}

 // 함수(람다)를 반환
static MyFunction getOperation(String operator) {
// ...
    return (a, b) -> a + b;
}
```

# 3. 함수형 인터페이스

함수형 인터페이스에 제네릭을 도입해 코드 재사용성을 늘리고 타입 안전성을 높일 수 있다.   
매개변수의 타입과 반환 값은 사용 시점에 제네릭을 사용해 변경할 수 있어 재사용성이 높다.    

```java
public class GenericMain6 {
 
    public static void main(String[] args) {
        GenericFunction<String, String> toUpperCase = str -> str.toUpperCase();
        GenericFunction<String, Integer> stringLength = str -> str.length();
        GenericFunction<Integer, Integer> square = x -> x * x;
        GenericFunction<Integer, Boolean> isEven = num -> num % 2 == 0;
        
        System.out.println(toUpperCase.apply("hello"));
        System.out.println(stringLength.apply("hello"));
        System.out.println(square.apply(3));
        System.out.println(isEven.apply(3));
    }
    
    @FunctionalInterface
    interface GenericFunction<T, R> {
        R apply(T s);
    }
 }
```

람다를 사용하려면 함수형 인터페이스가 필수이므로 개발자마다 GenericFunction 같은 함수형 인터페이스를 각각 만들어 사용해야 한다.    
그러나 개발자A가 만든 함수형 인터페이스와 개발자B가 만든 함수형 인터페이스는 서로 호환되지 않는다.   

```java
public class TargetType1 {
    public static void main(String[] args) {
        // 람다 직접 대입: 문제 없음
        FunctionA functionA = i -> "value = " + i;
        FunctionB functionB = i -> "value = " + i;
 
        // 이미 만들어진 FunctionA 인스턴스를 FunctionB에 대입: 불가능
        FunctionB targetB = functionA;  // 컴파일 에러!
    }
    
    @FunctionalInterface
    interface FunctionA {
        String apply(Integer i);
    }
    
    @FunctionalInterface
    interface FunctionB {
        String apply(Integer i);
    }
}
```

이런 문제를 해결하기 위해 자바는 기본으로 제공하는 함수형 인터페이스가 있다.   

# Java의 함수형 인터페이스 정리

#### 기본 함수형 인터페이스

| 인터페이스         | 설명                             | 메서드 시그니처 | 대표 사용 예시 |
|--------------------|----------------------------------|-------------| --- |
| Function<T, R>     | T를 받아 R 반환                  | R apply(T t) | 데이터 변환, 필드 추출 등 |
| Consumer<T>        | T를 소비, 반환값 없음            | void accept(T t) | 로그 출력, DB 저장 등 |
| Supplier<T>        | 인자 없이 T 반환                 | T get() | 객체 생성, 값 반환 등 |
| Runnable           | 인자와 반환이 없음 | void run() | 스레드 실행(멀티스레드) |

#### 특화 함수형 인터페이스

| 인터페이스         | 설명                             | 메서드 시그니처                   | 대표 사용 예시 |
|--------------------|----------------------------------|------------------------------------| --- |
| Predicate<T>       | T를 받아 boolean 반환            | boolean test(T t)                  | 조건 검사, 필터링 |
| UnaryOperator<T>   | T를 받아 T 반환 (Function 특수형)| T apply(T t)                       | 단항 연산(문자열 변환, 단한 계산) |
| BinaryOperator<T>  | T 두 개를 받아 T 반환            | T apply(T t1, T t2)                | 이항 연산 (두 수의 합, 최댓 값 반환) |

#### 사용 예

```java
// Predicate<T>
Predicate<String> isLong = s -> s.length() > 5;
System.out.println(isLong.test("HelloWorld")); // true

// Function<T, R>
Function<String, Integer> toLength = s -> s.length();
System.out.println(toLength.apply("Hello")); // 5

// Consumer<T>
Consumer<String> printer = s -> System.out.println("Hello " + s);
printer.accept("Java"); // Hello Java

// Supplier<T>
Supplier<Double> random = () -> Math.random();
System.out.println(random.get()); // 0.123...

// UnaryOperator<T>
UnaryOperator<String> shout = s -> s.toUpperCase();
System.out.println(shout.apply("hello")); // HELLO

// BinaryOperator<T>
BinaryOperator<Integer> sum = (a, b) -> a + b;
System.out.println(sum.apply(3, 5)); // 8
```

# 4. 람다 활용

Filter와 Map은 값을 선별하거나 매핑하는 선언적 프로그래밍을 돕는 기능이다.    
값을 선별하거나 매핑하는 방법을 람다 표현식으로 전달해 원하는 기능을 선언적으로 개발할 수 있다.   

### Filter

#### 필터 구현

```java
public class GenericFilter {
    public static <T> List<T> filter(List<T> list, Predicate<T> predicate) {
        List<T> result = new ArrayList<>();
        for (T num : list) 
            if (predicate.test(num)) result.add(num);
            
        return result;
    }
 }

public class FilterMainV5 {
    public static void main(String[] args) {
        // 숫자 사용 필터
        List<Integer> numbers = List.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
        List<Integer> numbersResult = GenericFilter.filter(numbers, n -> n % 2 == 0);
        System.out.println("numbersResult = " + numbersResult); // [2, 4, 6, 8, 10]
        
        // 문자 사용 필터
        List<String> strings = List.of("A", "BB", "CCC");
        List<String> stringsResult = GenericFilter.filter(strings, s -> s.length() >= 2);
        System.out.println("stringsResult = " + stringsResult); // [BB, CCC]
    }
 }
```

### Map

#### 맵 구현 

```java
 public class GenericMapper {
    public static <T, R> List<R> map(List<T> list, Function<T, R> mapper) {
        List<R> result = new ArrayList<>();
        for (T s : list) 
            result.add(mapper.apply(s));

        return result;
    }
}

 public class MapMainV5 {
    public static void main(String[] args) {
        List<String> fruits = List.of("apple", "banana", "orange");
        // String -> String
        List<String> upperFruits = GenericMapper.map(fruits, s -> s.toUpperCase());
        System.out.println(upperFruits); // [APPLE, BANANA, ORANGE]
        
        // String -> Integer
        List<Integer> lengthFruits = GenericMapper.map(fruits, s -> s.length());
        System.out.println(lengthFruits); // [5, 6, 6]
        // Integer -> String
        List<Integer> integers = List.of(1, 2, 3);
        List<String> starList = GenericMapper.map(integers, n -> "*".repeat(n));
        System.out.println(starList); // [*, **, ***]
    }
}
```

### 명령형 vs 선언적 프로그래밍

명령형 프로그래밍은 프로그램이 어떻게 수행되어야 하는지 수행 절차를 명시하는 방식이다.    
선언적 프로그래밍은 프로그램이 무엇을 수행하는지 명시하는 방식이다.    

<br/>

명령형 프로그래밍은 for, if와 같은 제어문을 사용해 코드 가독성이 낮고 로직이 복잡해 질수록 중복 코드가 늘어난다.   
선언적 프로그래밍은 원하는 결과를 얻기 위한 내부 처리 방식이 추상화되어 있어 개발자가 무엇을 원하는지 집중할 수 있게 한다.   
선언적 프로그래밍을 돕는 Map, filter와 같은 기능을 사용해 어떻게 필터링하고 변환하는지 세부 로직은 신경 쓰지 않고 원하는 결과만 기술할 수 있어 선언적으로 프로그래밍을 할 수 있다.   

#### Map, Filter의 활용
```java
public class Student {
    private String name;
    private int score;

    public Student(String name, int score) {
        this.name = name;
        this.score = score;
    }

    public String getName() {
        return name;
    }

    public int getScore() {
        return score;
    }

    @Override
    public String toString() {
        return "Student{" +
                "name='" + name + '\'' +
                ", score=" + score +
                '}';
    }
}

public class Ex2_Student {
    public static void main(String[] args) {
        // 점수가 80점 이상인 학생의 이름을 추출해라.
        List<Student> students = List.of(
                new Student("Apple", 100),
                new Student("Banana", 80),
                new Student("Berry", 50),
                new Student("Tomato", 40)
        );
        List<String> directResult = direct(students);
        System.out.println("directResult = " + directResult);
        List<String> lambdaResult = lambda(students);
        System.out.println("lambdaResult = " + lambdaResult);
    }

    private static List<String> direct(List<Student> students) {
        List<String> result = new ArrayList<>();
        for (Student s : students)
            if (s.getScore() >= 80) result.add(s.getName());

        return result;
    }

    private static List<String> lambda(List<Student> students) {
        return GenericMapper.map(GenericFilter.filter(students, s -> s.getScore() >= 80), s -> s.getName());
    }
}
```

### Stream

filter, map 함수는 처리할 값을 매개변수로 전달해야해서 코드 가독성이 좋지 않다.    
코드 가독성을 높여 좀 더 선언적으로 프로그래밍할 수 있도록 돕는 Stream 객체를 만들어본다.   

<br/>

Stream 객체에 아래 기능을 추가했다.   

- 메서드 체인, 자기 자신의 타입을 반환해 메서드 체인 방식을 사용해 filter, map을 적용할 수 있다.
- 정적 팩토리 메서드, 생성자 대신 인스턴스를 생성하고 반환하는 역할, 클래스의 인스턴스를 생성하고 초기화하는 로직을 캡슐화한다.
- 제네릭, 제네릭을 도입해 다양한 타입에서 재사용할 수 있다.
- 내부반복 지원, 결과를 처리하기 위해 for문, while 문과 같은 반복문을 직접 사용하지 않아도 된다.

```java
public class MyStreamV3<T> {
    private List<T> internalList;

    private MyStreamV3(List<T> internalList) {
        this.internalList = internalList;
    }

    public static <T> MyStreamV3<T> of(List<T> list) {
        return new MyStreamV3<>(list);
    }

    public MyStreamV3<T> filter(Predicate<T> predicate) {
        List<T> filtered = new ArrayList<>();
        for (T element : internalList)
            if (predicate.test(element)) filtered.add(element);

        return MyStreamV3.of(filtered);
    }

    public <R> MyStreamV3<R> map(Function<T, R> function) {
        List<R> mapped = new ArrayList<>();
        for (T element : internalList)
            mapped.add(function.apply(element));

        return MyStreamV3.of(mapped);
    }

    public void forEach(Consumer<T> consumer) {
        for (T element : internalList) consumer.accept(element);
    }

    public List<T> toList() {
        return internalList;
    }
}
```

Stream 객체를 아래 코드와 같이 활용할 수 있다.

```java
public class MyStreamV3Main {
    public static void main(String[] args) {
        List<Student> students = List.of(
                new Student("Apple", 100),
                new Student("Banana", 80),
                new Student("Berry", 50),
                new Student("Tomato", 40)
        );
        // 점수가 80점 이상인 학생의 이름을 추출해라.
        MyStreamV3.of(students)
                .filter(s -> s.getScore() >= 80)
                .map(s -> s.getName())
                .forEach(System.out::println);
        // 점수가 80점 이상이면서, 이름이 5글자인 학생의 이름을 대문자로 추출해라.
        MyStreamV3.of(students)
                .filter(s -> s.getScore() >= 80)
                .filter(s -> s.getName().length() == 5)
                .map(s -> s.getName().toUpperCase())
                .forEach(System.out::println);
    }
}
```

# 5. 람다 vs 익명 클래스

람다와 익명 클래스의 사용 방식과 의도에는 차이가 있다.

### 상속 관계

익명 클래스는 다양한 인터페이스와 클래스를 구현하거나 상속할 수 있다.   
람다 표현식은 메서드를 하나만 가지는 함수형 인터페이스만 구현할 수 있다.    
클래스를 상속할 수 없고 상태(필드, 멤버 변수)나 추가적인 메서드 오버라이딩은 불가능하다.   
따라서 람다는 단순히 함수를 정의하는 것으로 상태나 추가적인 상속 관계가 필요 없는 상황에 사용한다.   

### this 키워드의 의미

익명 클래스 내부에서 this는 익명 클래스 자신을 가리킨다.   
람다 표현식에서 this는 람다를 선언한 클래스의 인스턴스를 가리킨다.   
람다 표현식은 별도의 컨텍스트를 가지는 것이 아니라 람다를 선언한 클래스의 컨텍스트를 유지한다.   

```java
public class OuterMain {

    private String message = "외부 클래스";

    public void execute() {
        // 1. 익명 클래스 예시
        Runnable anonymous = new Runnable() {

            private String message = "익명 클래스";

            @Override
            public void run() {
                // 익명 클래스에서의 this는 익명 클래스의 인스턴스를 가리킴
                System.out.println("[익명 클래스] this: " + this);
                System.out.println("[익명 클래스] this.class: " + this.getClass());
                System.out.println("[익명 클래스] this.message: " + this.message);
            }
        };

        // 2. 람다 예시
        Runnable lambda = () -> {
            // 람다에서의 this는 람다가 선언되 클래스의 인스턴스(즉, 외부 클래스) 가리킴
            System.out.println("[람다] this: " + this);
            System.out.println("[람다] this.class: " + this.getClass());
            System.out.println("[람다] this.message: " + this.message);
        };

        anonymous.run();
        System.out.println("------------------------------------");
        lambda.run();
    }

    public static void main(String[] args) {
        OuterMain outer = new OuterMain();
        System.out.println("[외부 클래스]: " + outer);
        System.out.println("----------------------------------");
        outer.execute();
    }
}
```

### 캡처링

익명 클래스와 람다 표현식의 지역 변수는 캡처링을 지원한다.   
캡처링은 내부에서 자신이 정의된 외부 스코프에 있는 지역 변수를 참조하는 것 이다.    
캡처링 되는 변수는 final 이거나 effectively final 이어야 한다.   
effectively final은 변수에 final 키워드는 없지만 할당된 값이 변하지 않는 변수를 말한다.   
값을 한 번만 할당하고 그 이후에 변경하지 않아야 익명 클래스와 람다 표현식에서 참조할 수 있다.   
그렇지 않으면 컴파일 에러가 발생한다.   

### 생성 방식

익명 클래스는 새로운 클래스를 정의해 객체를 생성하는 방식이다.   
그래서 OuterClass$1.class와 같이 이름이 지정된 클래스 파일이 생성되고 클래스가 메모리 상에서 별도로 관리된다.   

<br/>

람다는 invokeDynamic이라는 메커니즘을 사용해 컴파일 타임에 실제 클래스 파일을 생성하지 않고 런타임 시점에서 동적으로 필요한 코드를 처리한다.   
그래서 람다는 클래스 파일을 생성하지 않고 익명 클래스보다 메모리 관리가 더 효율적이다.   

### 상태 관리

익명 클래스는 인스턴스 내부에 상태(필드, 멤버 변수)를 가질 수 있다.    
람다는 필드(멤버 변수)가 없으므로 스스로 상태를 유지하지 않는다.   

### 익명 클래스와 람다의 용도

익명 클래스는 상태를 유지하거나 다중 메서드를 구현할 필요가 있는 경우 사용하고   
람다는 상태를 유지할 필요가 없고 함수형 인터페이스를 구현할 때 사용한다.   

# 6. 메서드 참조

아래 코드와 같이 동일한 기능을 하는 람다가 여러 개 있으면 코드가 중복되어 유지보수가 어려울 수 있다.

```java
public class MethodRefStartV2 {

    public static void main(String[] args) {
        BinaryOperator<Integer> add1 = (x, y) -> add(x, y);
        BinaryOperator<Integer> add2 = (x, y) -> add(x, y);
        
        Integer result1 = add1.apply(1, 2);
        System.out.println("result1 = " + result1);
        
        Integer result2 = add2.apply(1, 2);
        System.out.println("result2 = " + result2);
    }

    
    static int add(int x, int y) {
        return x + y;
    }
}
```

특정 상황에서 메소드 참조를 사용해 람다를 좀 더 편리하게 사용할 수 있다.    
이미 정의된 메서드를 그대로 참조해 람다 표현식을 더 간결하게 작성하는 방법이다.   

```java
public class MethodRefStartV3 {

    public static void main(String[] args) {
        BinaryOperator<Integer> add1 = MethodRefStartV3::add; // (x, y) -> add(x, y)
        BinaryOperator<Integer> add2 = MethodRefStartV3::add; // (x, y) -> add(x, y)
        
        Integer result1 = add1.apply(1, 2);
        System.out.println("result1 = " + result1);
        
        Integer result2 = add2.apply(1, 2);
        System.out.println("result2 = " + result2);
    }
    
    static int add(int x, int y) {
        return x + y;
    }
}
```

메서드 참조는 4가지 유형이 있다.

|유형|문법|예|
|---|---|---|
|정적 메서드 참조|클래스명::메서드명|Math:mmax, Integer::parseInt|
|특정 객체의 인스턴스 메서드 참조|객체명::인스턴스메서드명|person::introduce, person::getName|
|생성자 참조|클래스명::new|Person::new|
|임의 객체의 인스턴스 메서드 참조|클래스명::인스턴스메서드명|Person::introduce, (Person p) -> p.introduce|

함수형 인터페이스의 시그니처에 매개변수와 반환 타입이 정해져 있고 컴파일러가 시그니처를 바탕으로 메서드 참조와 연결해 주기 때문에,    
메서드 참조에서 명시적으로 매개변수를 작성하지 않아도 된다.   

```java
public class Person {
    private String name;

    public Person() {
        this("Unknown");
    }

    public Person(String name) {
        this.name = name;
    }

    // 정적 메서드
    public static String greeting() {
        return "Hello";
    }

    // 정적 메서드, 매개변수
    public static String greetingWithName(String name) {
        return "Hello " + name;
    }

    public String getName() {
        return name;
    }

    // 인스턴스 메서드
    public String introduce() {
        return "I am " + name;
    }

    // 인스턴스 메서드, 매개변수
    public String introduceWithNumber(int number) {
        return "I am " + name + ", my number is " + number;
    }
}

public class MethodRefEx2 {

    public static void main(String[] args) {
        // 1. 정적 메서드 참조
        Function<String, String> staticMethod1 = name -> Person.greetingWithName(name);
        Function<String, String> staticMethod2 = Person::greetingWithName;

        System.out.println("staticMethod1: " + staticMethod1.apply("Kim"));
        System.out.println("staticMethod2: " + staticMethod2.apply("Kim"));

        // 2. 특정 객체의 인스턴스 참조
        Person person = new Person("Kim");
        Function<Integer, String> instanceMethod1 = n -> person.introduceWithNumber(n);
        Function<Integer, String> instanceMethod2 = person::introduceWithNumber;

        System.out.println("instanceMethod1: " + instanceMethod1.apply(1));
        System.out.println("instanceMethod2: " + instanceMethod2.apply(1));

        // 3. 생성자 참조
        Function<String, Person> newPerson1 = name -> new Person(name);
        Function<String, Person> newPerson2 = Person::new;

        System.out.println("newPerson1: " + newPerson1.apply("Kim"));
        System.out.println("newPerson2: " + newPerson2.apply("Kim"));
    }
}

public class MethodRefEx6 {

    public static void main(String[] args) {
        // 4. 임의 객체의 인스턴스 메서드 참조(특정 타입의)
        Person person = new Person("Kim");

        // 람다
        BiFunction<Person, Integer, String> fun1 = (Person p, Integer number) -> p.introduceWithNumber(number);

        System.out.println("person.introduceWithNumber = " + fun1.apply(person, 1));

        // 메서드 참조, 타입이 첫 번째 매개변수가 됨, 그리고 첫 번째 매개변수의 메서드를 호출
        // 나머지는 순서대로 매개변수에 전달
        BiFunction<Person, Integer, String> fun2 = Person::introduceWithNumber; // 타입::메서드명
        System.out.println("person.introduceWithNumber = " + fun1.apply(person, 1));

    }
}
```
