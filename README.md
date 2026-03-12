<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Email (Gmail SMTP para profesores)

Este backend envía correos salientes a profesores usando Gmail SMTP. No maneja respuestas.

Variables requeridas:

- `EMAIL_ENABLED=false`
- `EMAIL_PROVIDER=smtp`
- `EMAIL_HOST=smtp.gmail.com`
- `EMAIL_PORT=465`
- `EMAIL_SECURE=true`
- `EMAIL_USER=__PUT_TEST_GMAIL_ADDRESS_HERE__`
- `EMAIL_PASS=__PUT_GMAIL_APP_PASSWORD_HERE__`
- `EMAIL_FROM_NAME=__PUT_SCHOOL_DISPLAY_NAME_HERE__`
- `EMAIL_FROM_ADDRESS=__PUT_TEST_GMAIL_ADDRESS_HERE__`
- `EMAIL_BULK_BATCH_SIZE=20`

Comportamiento clave:

- Si `EMAIL_ENABLED=false`, no se envían correos reales. Se registra un `EMAIL_PREVIEW` estructurado con asunto y vista previa del cuerpo.
- Notificaciones masivas usan BCC y se envían en lotes para no exponer correos entre profesores.
- El campo `to` se deja con `EMAIL_FROM_ADDRESS` como destinatario seguro.

Cómo probar localmente:

- Mantén `EMAIL_ENABLED=false` para validar el contenido en logs.
- Cambia a `EMAIL_ENABLED=true` y configura un app password de Gmail para envío real.

Generar app password de Gmail:

1. En la cuenta Gmail, ve a **Seguridad** → **Verificación en dos pasos**.
2. Crea una **Contraseña de aplicación** para SMTP.
3. Colócala en `.env` como `EMAIL_PASS` (no la subas a git).

Comandos útiles:

- Verificar conexión SMTP: `npm run email:verify`
- Enviar un correo de prueba: `npm run email:test -- prof1@example.com`

Importante:

- No cometas `EMAIL_PASS` ni archivos `.env` en git.

Ejemplo de uso (demo):

```ts
await emailService.sendWelcomeEmail({
  recipientEmail: 'prof1@example.com',
  recipientName: 'Ana Gomez',
  username: 'ana.gomez',
  temporaryPassword: 'Temp#1234',
  coordinatorName: 'Coord. Maria',
  schoolName: 'Colegio Central',
})

await emailService.sendMeetingNotification({
  recipientEmails: [
    'prof1@example.com',
    'prof2@example.com',
    'prof3@example.com',
    'prof4@example.com',
    'prof5@example.com',
  ],
  subject: 'Reunión general',
  message: 'Reunión el viernes a las 3pm.',
  meetingDate: '2026-03-20 15:00',
  coordinatorName: 'Coord. Maria',
  schoolName: 'Colegio Central',
})
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
