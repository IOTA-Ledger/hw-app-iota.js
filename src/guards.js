import Joi from 'joi';

const validInteger = Joi.number().integer();
const validSecurity = validInteger.min(1).max(3); // low, medium or high
const validIndex = validInteger.min(0).max(4294967295); // 32 bit unsigned int
const validValue = validInteger.min(0).max(2779530283277761);
const validBalance = validInteger.min(1).max(2779530283277761);

const validTrytes = Joi.string().regex(/^[A-Z9]+$/); // tryte string in the default base-27 encoding
const validTag = validTrytes.allow('').max(27);
const validAddress = Joi.alternatives().try(
  validTrytes.length(81), // without checksum
  validTrytes.length(90) // with checksum
);

const validTransfers = Joi.array()
  .items(
    Joi.object({
      address: validAddress.required(),
      tag: validTag.required(),
      value: validValue.required(),
    }).unknown()
  )
  .min(1);
const validInputs = Joi.array()
  .items(
    Joi.object({
      address: validAddress.required(),
      balance: validBalance.required(),
      keyIndex: validIndex.required(),
      tags: Joi.array().items(validTag).optional(),
    }).unknown()
  )
  .min(1);
const validRemainder = Joi.object({
  address: validAddress.required(),
  keyIndex: validIndex.required(),
  tag: validTag.optional(),
}).unknown();

export function string(value) {
  Joi.assert(value, Joi.string().required());
}

export function security(value) {
  Joi.assert(value, validSecurity.required());
}

export function index(value) {
  Joi.assert(value, validIndex.required());
}

export function transfers(value) {
  Joi.assert(value, validTransfers.required());
}

export function inputs(value) {
  Joi.assert(value, validInputs.required());
}

export function remainder(value) {
  Joi.assert(value, validRemainder.optional());
}

export function trytes(value) {
  Joi.assert(value, validTrytes.required());
}

export function nullaryFunc(value) {
  Joi.assert(value, Joi.func().arity(0).required());
}
