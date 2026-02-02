# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - link "HIRVO.AI" [ref=e5] [cursor=pointer]:
        - /url: /
        - heading "HIRVO.AI" [level=1] [ref=e6]
      - paragraph [ref=e7]: Sign in to your account
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]:
          - generic [ref=e11]: Email
          - textbox "Email" [ref=e12]:
            - /placeholder: you@example.com
        - generic [ref=e13]:
          - generic [ref=e14]: Password
          - textbox "Password" [ref=e15]:
            - /placeholder: ••••••••
        - button "Sign in" [ref=e16]
      - generic [ref=e21]: Or continue with
      - button "Sign in with Google" [ref=e22]:
        - img [ref=e23]
        - text: Sign in with Google
      - paragraph [ref=e28]:
        - text: Don't have an account?
        - link "Sign up" [ref=e29] [cursor=pointer]:
          - /url: /signup
  - button "Open Next.js Dev Tools" [ref=e35] [cursor=pointer]:
    - img [ref=e36]
  - alert [ref=e39]
```