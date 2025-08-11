import { ContainerLike } from "../interfaces/container"

export class Container implements ContainerLike {
  _registry: Map<string, any[]> = new Map()

  get<T>(name: string) {
    return (this._registry.get(name) || []) as T[]
  }

  register(name: string, value: any) {
    let instance = this._registry.get(name) || []
    if (value.useClass) {
      instance.push(new value.useClass())
    } 
    else if (value.useValue) {
      instance.push(value.useValue)
    }
    else {
      instance.push(value)
    }
    this._registry.set(name, instance)
  }

  resolve<T>(name: string) {
    let instances = this.get<T>(name)
    let instance = instances.length === 1 ? instances[0] : instances
    if (instance) {
      return instance as T
    }

    throw new Error(`No instance found for ${name}`)
  }

  resolveAll<T>(name: string) {
    let instances = this.get<T>(name)
    let result = []
    for (const instance of instances) {
      result.push(instance)
    }
    return result
  }

  createContainer() {
    return new Container()
  }
}

export const container = new Container()