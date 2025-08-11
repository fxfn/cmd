export enum Lifecycle {
  Transient,
  Singleton,
  ResolutionScoped,
  ContainerScoped
}

type RegistrationOptions = {
  lifecycle: Lifecycle
  tag?: string
}

export type Constructor<T = {}> = (new (...args: any[]) => T) & { tag?: string}

export type AbstractConstructor<T = {}> = abstract new (...args: any[]) => T

export interface ClassProvider<T> {
  useClass: Constructor<T>
}

export interface ValueProvider<T> {
  useValue: T
}

export type Provider<T = any> =
  { tag?: string } & (
    | ClassProvider<T>
    | ValueProvider<T>
  )

type InjectionToken<T = any> = 
  | Constructor<T>
  | AbstractConstructor<T>
  | string
  | symbol

export abstract class ContainerLike {
  abstract register<T>(
    token: InjectionToken<T>,
    providerOrConstructor: Provider<T> | Constructor<T>,
    options?: RegistrationOptions
  ): void

  abstract resolve<T>(
    token: InjectionToken<T>,
    tag?: string
  ): T

  abstract resolveAll<T>(
    token: InjectionToken<T>,
    tag?: string
  ): T[]

  abstract createContainer(): ContainerLike
}