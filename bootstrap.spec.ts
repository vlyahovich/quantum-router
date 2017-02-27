import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

let context = (<any>require).context('./src', true, /.spec\.ts$/);

context.keys().forEach(context);
