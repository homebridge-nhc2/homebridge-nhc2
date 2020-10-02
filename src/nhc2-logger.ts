import {
  Logging,
  PlatformConfig
} from "homebridge";

export class NHC2Logger {
  private readonly wrappedLogger: Logging;
  private readonly logVerbose: boolean;
  
  constructor(
    private log: Logging,
    private config: PlatformConfig
  ) {
    this.wrappedLogger = log;
    this.logVerbose = config.verbose || false;
  }

  public info(message: string, ...parameters: any[]) : void {
    this.wrappedLogger.info(message, ...parameters);
  }
  public warn(message: string, ...parameters: any[]) : void {
    this.wrappedLogger.warn(message, ...parameters);
  }
  public error(message: string, ...parameters: any[]) : void {
    this.wrappedLogger.error(message, ...parameters);
  }
  public debug(message: string, ...parameters: any[]) : void {
    this.wrappedLogger.debug(message, ...parameters);
  }
  public verbose(message: string, ...parameters: any[]): void {
    if( this.logVerbose ) {
      this.info(message, ...parameters);
    }  
  }
}
