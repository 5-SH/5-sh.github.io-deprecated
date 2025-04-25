---
layout: post
title: 인터페이스와 설계 품질
date: 2021-04-20 01:40:00 + 0900
categories: [object]
tags: [object]
---

# 인터페이스와 설계 품질
  퍼블릭 인터페이스의 품질에 영향을 미치는 원칙
  
## 1. 디미터 법칙
  객체의 내부 구조에 강하게 결합되지 않도록 협력 경로를 제한한다.    
  협력 경로를 제한하면 결합도를 효과적으로 낮출 수 있다.   
  아래 조건을 만족하는 인스턴스에만 메세지를 전송해야 한다.
  - this 객체
  - 메서드의 매개변수
  - this 의 속성
  - this 의 속성인 컬렉션의 요소
  - 메서드 내에서 생성된 지역 객체
  
#### 기차 충돌
```java
screening.getMovie().getDiscountConditions();
```
  클래스의 내부 구현이 외부로 노출되었을 경우 나타나는 전형적인 형태.   
  메세지 전송자가 수신자의 내부 구조에 대해 물어보고 반환받은 요소에 대해 연쇄적으로 메세지를 전송한다.
       
## 2. 묻지 말고 시켜라
  메세지 전송자는 메세지 수신자의 상태를 기반으로 결정을 내린 후 메세지 수신자의 상태를 바꿔서는 안된다.   
  객체의 외부에서 해당 객체의 상태를 기반으로 결정을 내리는 것은 캡슐화를 위반한다.   
  묻지 말고 시켜라 원칙을 따르면 객체의 정보를 이용하는 행동을 객체의 외부가 아닌 내부에 위치시키기 때문에   
  자연스럽게 정보와 행동을 동일한 클래스에 두어 높은 응집도를 가진 클래스를 얻을 수 있다.   
  인터페이스는 객체가 어떻게 하는지가 아니라 무엇을 하는지를 서술해야 한다.   
  
## 3. 의도를 드러내는 인터페이스  
  책임을 수행하는 방법을 드러내는 메서드를 사용한 설계는 협력하는 객체의 종류를 알도록 강요한다. 따라서 캡슐화를 위반하고 변경에 취약할 수 밖에 없다.   
  인터페이스의 의도를 드러내기 위해서는 '어떻게'가 아니라 '무엇'을 하는지를 드러내야 한다.   
  무엇을 하는지 드러내는 메서드 이름을 짓기 위해서는 클라이언트 관점에서 객체가 협력 안에서 수행해야 하는 책임에 관해 고민해야 한다. 
  
## 4. 코드
  아래 enter 메서드는 디미터 법칙을 위반한 코드의 전형적인 모습이다.   
  Theater 가 audience 와 ticketSeller 내부에 포함된 객체에도 직접 접근한다.   
  
```java
public class Theater {
  private TicketSeller ticketSeller;
  
  public Theater(TicketSeller ticketSeller) {
    this.ticketSeller = ticketSeller;
  }
  
  public void enter(Audience audience) {
    if (audience.getBag().hasInvitation()) {
      Ticket ticket = ticketSeller.getTicketOffice().getTicket();
      audience.getBag().setTicket(ticket);
    } else {
      Ticket ticket = ticketSeller.getTicketOffice().getTicket();
      // 기차 충돌 스타일
      audience.getBag().minusAumount(ticket.getFee());
      ticketSeller.getTicketOffice().plusAmount(ticket.getFee());
      audience.getBag().setTicket(ticket);
    }
  }
}
```
   
디미터 법칙, 묻지 말고 시켜라, 의도를 드러내는 인터페이스 법칙을 적용해 리팩토링한 코드

```java
public class Bag {
  public Long hold(Ticket ticket) {
    if (hasInvitation()) {
      this.ticket = ticket;
      return 0;
    } else {
      this.ticket = ticket;
      minusAmount(ticket.getFee());
      return ticket.getFee();
    }
  }
  
  private boolean hasInvitation() {
    return invitation != null;
  }
  
  private void minusAmount(Long amount) {
    this.amount -= amount;
  }
}

public class Audience {
 public Long buy(Ticket ticket) {
   return bag.hold(ticket);
 }
}

public class TicketSeller {
  public void sellTo(Audience audience) {
    ticketOffice.plusAmount(audience.buy(ticketOffice.getTicket()));
  }
}

public class Theater {
  public void enter(Audience audience) {
    ticketSeller.sellTo(audience);
  }
}

```

## 5. 정리
  디미터 법칙은 캡슐화를 위반하는 메세지가 인터페이스에 포함되지 않도록 제한한다.   
  묻지 말고 시켜라 원칙은 디미터 법칙을 준수하는 협력을 만들기 위한 스타일을 제시한다.   
  의도를 드러내는 인터페이스 원칙은 코드의 목적을 명확하게 커뮤니케이션할 수 있게 해준다.
